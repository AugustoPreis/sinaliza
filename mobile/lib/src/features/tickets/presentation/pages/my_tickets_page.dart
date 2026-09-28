import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:mobile/src/core/utils/context_extensions.dart';
import 'package:mobile/src/features/notifications/presentation/cubit/unread_notifications_cubit.dart';
import 'package:mobile/src/core/l10n/app_strings.dart';
import 'package:mobile/src/core/router/app_router_enum.dart';
import 'package:mobile/src/core/styles/app_spacing.dart';
import 'package:mobile/src/core/widgets/app_snackbar.dart';
import 'package:mobile/src/core/widgets/error_view.dart';
import 'package:mobile/src/core/widgets/paged_list_widgets.dart';
import 'package:mobile/src/features/tickets/domain/repositories/tickets_repository.dart';
import 'package:mobile/src/features/tickets/domain/ticket_filter.dart';
import 'package:mobile/src/features/tickets/presentation/cubit/my_tickets_cubit.dart';
import 'package:mobile/src/features/tickets/presentation/widgets/ticket_list_skeleton.dart';
import 'package:mobile/src/features/tickets/presentation/widgets/ticket_list_tile.dart';

/// A.2 Meus chamados: abas Todos / Abertos / Resolvidos, rolagem infinita,
/// pull-to-refresh e acesso ao detalhe (A.6) e ao novo relato (A.3).
class MyTicketsPage extends StatefulWidget {
  const MyTicketsPage({super.key});

  @override
  State<MyTicketsPage> createState() => _MyTicketsPageState();
}

class _MyTicketsPageState extends State<MyTicketsPage>
    with SingleTickerProviderStateMixin {
  late final TabController _tabs = TabController(
    length: TicketFilter.values.length,
    vsync: this,
  )..addListener(_onTabChanged);

  /// Um cubit por aba: trocar de aba não recarrega a lista.
  late final Map<TicketFilter, MyTicketsCubit> _cubits = {
    for (final filter in TicketFilter.values)
      filter: MyTicketsCubit(
        repository: context.read<TicketsRepository>(),
        filter: filter,
      ),
  };

  MyTicketsCubit get _current => _cubits[TicketFilter.values[_tabs.index]]!;

  @override
  void initState() {
    super.initState();
    _current.loadIfNeeded();
  }

  @override
  void dispose() {
    _tabs.dispose();
    for (final cubit in _cubits.values) {
      cubit.close();
    }
    super.dispose();
  }

  void _onTabChanged() {
    if (!_tabs.indexIsChanging) _current.loadIfNeeded();
  }

  /// Chamado ao voltar de outra tela que pode ter mudado a lista.
  void _refreshLoaded() {
    for (final cubit in _cubits.values) {
      cubit.refresh();
    }
  }

  Future<void> _openNewReport() async {
    await Navigator.of(context).pushNamed(AppRouterEnum.newReport.route);
    // Voltou do fluxo A.3 -> A.5: o chamado novo deve aparecer no topo.
    if (mounted) _refreshLoaded();
  }

  Future<void> _openDetail(String ticketId) async {
    await Navigator.of(
      context,
    ).pushNamed(AppRouterEnum.ticketDetail.route, arguments: ticketId);
    // O status pode ter mudado enquanto o detalhe estava aberto.
    if (mounted) _refreshLoaded();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text(AppStrings.myTicketsTitle),
        bottom: TabBar(
          controller: _tabs,
          // Com fonte grande as três abas não cabem lado a lado: rolam em vez
          // de cortar o texto ("Resolv...").
          isScrollable: MediaQuery.textScalerOf(context).scale(1) > 1.3,
          tabAlignment: MediaQuery.textScalerOf(context).scale(1) > 1.3
              ? TabAlignment.start
              : null,
          tabs: [
            for (final filter in TicketFilter.values) Tab(text: filter.label),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabs,
        children: [
          for (final filter in TicketFilter.values)
            BlocProvider.value(
              value: _cubits[filter]!,
              child: _TicketsTab(onOpen: _openDetail),
            ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _openNewReport,
        icon: const Icon(Icons.add),
        label: const Text(AppStrings.newReportTitle),
      ),
    );
  }
}

class _TicketsTab extends StatefulWidget {
  const _TicketsTab({required this.onOpen});

  final ValueChanged<String> onOpen;

  @override
  State<_TicketsTab> createState() => _TicketsTabState();
}

class _TicketsTabState extends State<_TicketsTab>
    with AutomaticKeepAliveClientMixin {
  // Mantém a posição de rolagem ao trocar de aba.
  @override
  bool get wantKeepAlive => true;

  bool _onScroll(ScrollNotification notification) {
    if (isNearListEnd(notification)) context.read<MyTicketsCubit>().loadMore();
    return false;
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    final cubit = context.read<MyTicketsCubit>();

    return BlocConsumer<MyTicketsCubit, MyTicketsState>(
      // Refresh falhou com a lista na tela: avisa sem apagar a lista.
      listenWhen: (previous, current) =>
          current.items.isNotEmpty &&
          current.failure != null &&
          previous.failure != current.failure,
      listener: (context, state) =>
          AppSnackbar.failure(context, state.failure!),
      builder: (context, state) {
        return switch (state.status) {
          MyTicketsStatus.initial ||
          MyTicketsStatus.loading => const TicketListSkeleton(),
          MyTicketsStatus.failure => ErrorView(
            message: state.failure?.message ?? AppStrings.genericError,
            onRetry: cubit.load,
          ),
          MyTicketsStatus.success => RefreshIndicator(
            onRefresh: () {
              // Aproveita para atualizar a bolinha de não lidas da home.
              unawaited(
                context.maybeRead<UnreadNotificationsCubit>()?.refresh(),
              );
              return cubit.refresh();
            },
            child: state.isEmpty
                ? ScrollableEmptyView(
                    icon: Icons.assignment_outlined,
                    message: cubit.filter.emptyMessage,
                  )
                : NotificationListener<ScrollNotification>(
                    onNotification: _onScroll,
                    child: _TicketList(state: state, onOpen: widget.onOpen),
                  ),
          ),
        };
      },
    );
  }
}

class _TicketList extends StatelessWidget {
  const _TicketList({required this.state, required this.onOpen});

  final MyTicketsState state;
  final ValueChanged<String> onOpen;

  @override
  Widget build(BuildContext context) {
    final showFooter = showPagedListFooter(state);

    return ListView.separated(
      physics: const AlwaysScrollableScrollPhysics(),
      // Espaço para o FAB não cobrir o último item.
      padding: const EdgeInsets.fromLTRB(
        AppSpacing.lg,
        AppSpacing.lg,
        AppSpacing.lg,
        AppSpacing.xxl * 3,
      ),
      itemCount: state.items.length + (showFooter ? 1 : 0),
      separatorBuilder: (_, _) => const SizedBox(height: AppSpacing.md),
      itemBuilder: (context, index) {
        if (index == state.items.length) {
          return PagedListFooter(
            state: state,
            failureMessage: AppStrings.ticketsLoadMoreFailed,
            onRetry: context.read<MyTicketsCubit>().loadMore,
          );
        }
        final ticket = state.items[index];
        return TicketListTile(ticket: ticket, onTap: () => onOpen(ticket.id));
      },
    );
  }
}
