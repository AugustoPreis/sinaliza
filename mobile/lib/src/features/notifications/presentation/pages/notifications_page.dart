import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:mobile/src/core/utils/context_extensions.dart';
import 'package:mobile/src/features/notifications/presentation/cubit/unread_notifications_cubit.dart';
import 'package:mobile/src/core/l10n/app_strings.dart';
import 'package:mobile/src/core/router/app_router_enum.dart';
import 'package:mobile/src/core/widgets/app_snackbar.dart';
import 'package:mobile/src/core/widgets/error_view.dart';
import 'package:mobile/src/core/widgets/loading_view.dart';
import 'package:mobile/src/core/widgets/paged_list_widgets.dart';
import 'package:mobile/src/features/home/presentation/widgets/home_tab_scope.dart';
import 'package:mobile/src/features/notifications/domain/notifications_refresh_signal.dart';
import 'package:mobile/src/features/notifications/domain/repositories/notifications_repository.dart';
import 'package:mobile/src/features/notifications/presentation/cubit/notifications_cubit.dart';
import 'package:mobile/src/features/notifications/presentation/widgets/notification_tile.dart';

/// A.7 Notificações: histórico de avisos de mudança de status; cada item
/// abre o chamado (A.6). As não lidas aparecem na bolinha da aba (a
/// `HomePage` marca tudo como lido ao entrar aqui).
///
/// Recarrega ao entrar na aba e quando [NotificationsRefreshSignal] avisa
/// (push em primeiro plano, task 15).
class NotificationsPage extends StatelessWidget {
  const NotificationsPage({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (context) => NotificationsCubit(
        repository: context.read<NotificationsRepository>(),
      ),
      child: const _NotificationsView(),
    );
  }
}

class _NotificationsView extends StatefulWidget {
  const _NotificationsView();

  @override
  State<_NotificationsView> createState() => _NotificationsViewState();
}

class _NotificationsViewState extends State<_NotificationsView> {
  StreamSubscription<void>? _signal;
  bool _active = false;

  @override
  void initState() {
    super.initState();
    _signal = context.read<NotificationsRefreshSignal>().stream.listen(
      (_) => _reload(),
    );
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    // Fora da home (tela sozinha) conta como ativa.
    final tab = HomeTabScope.of(context);
    final active = tab == null || tab == HomeTab.notifications;
    if (active && !_active) _reload();
    _active = active;
  }

  @override
  void dispose() {
    _signal?.cancel();
    super.dispose();
  }

  /// Primeira vez carrega; depois, recarrega mantendo a lista visível.
  void _reload() {
    final cubit = context.read<NotificationsCubit>();
    if (cubit.state.status == PagedListStatus.initial) {
      cubit.load();
    } else {
      cubit.refresh();
    }
  }

  Future<void> _open(String ticketId) async {
    await Navigator.of(
      context,
    ).pushNamed(AppRouterEnum.ticketDetail.route, arguments: ticketId);
  }

  bool _onScroll(ScrollNotification notification) {
    if (isNearListEnd(notification)) {
      context.read<NotificationsCubit>().loadMore();
    }
    return false;
  }

  @override
  Widget build(BuildContext context) {
    final cubit = context.read<NotificationsCubit>();

    return Scaffold(
      appBar: AppBar(title: const Text(AppStrings.notificationsTitle)),
      body: BlocConsumer<NotificationsCubit, NotificationsState>(
        listenWhen: (previous, current) =>
            current.items.isNotEmpty &&
            current.failure != null &&
            previous.failure != current.failure,
        listener: (context, state) =>
            AppSnackbar.failure(context, state.failure!),
        builder: (context, state) => switch (state.status) {
          // Antes de entrar na aba pela primeira vez, nada a mostrar.
          PagedListStatus.initial => const SizedBox.shrink(),
          PagedListStatus.loading => const LoadingView(),
          PagedListStatus.failure => ErrorView(
            message: state.failure?.message ?? AppStrings.genericError,
            onRetry: cubit.load,
          ),
          PagedListStatus.success => RefreshIndicator(
            onRefresh: () async {
              await cubit.refresh();
              // O que acabou de chegar já está na tela: conta como lido.
              if (context.mounted) {
                unawaited(
                  context.maybeRead<UnreadNotificationsCubit>()?.markAllRead(),
                );
              }
            },
            child: state.isEmpty
                ? const ScrollableEmptyView(
                    icon: Icons.notifications_none,
                    message: AppStrings.notificationsEmpty,
                  )
                : NotificationListener<ScrollNotification>(
                    onNotification: _onScroll,
                    child: ListView.separated(
                      physics: const AlwaysScrollableScrollPhysics(),
                      itemCount:
                          state.items.length +
                          (showPagedListFooter(state) ? 1 : 0),
                      separatorBuilder: (_, _) => const Divider(),
                      itemBuilder: (context, index) {
                        if (index == state.items.length) {
                          return PagedListFooter(
                            state: state,
                            failureMessage:
                                AppStrings.notificationsLoadMoreFailed,
                            onRetry: cubit.loadMore,
                          );
                        }
                        final item = state.items[index];
                        return NotificationTile(
                          notification: item,
                          onTap: () => _open(item.ticketId),
                        );
                      },
                    ),
                  ),
          ),
        },
      ),
    );
  }
}
