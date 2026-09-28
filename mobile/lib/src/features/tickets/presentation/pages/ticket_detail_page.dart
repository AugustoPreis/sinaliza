import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:mobile/src/core/l10n/app_strings.dart';
import 'package:mobile/src/core/styles/app_semantic_colors.dart';
import 'package:mobile/src/core/styles/app_spacing.dart';
import 'package:mobile/src/core/utils/context_extensions.dart';
import 'package:mobile/src/core/utils/formatters/date_formatter.dart';
import 'package:mobile/src/core/widgets/app_button.dart';
import 'package:mobile/src/core/widgets/app_snackbar.dart';
import 'package:mobile/src/core/widgets/empty_view.dart';
import 'package:mobile/src/core/widgets/error_view.dart';
import 'package:mobile/src/core/widgets/loading_view.dart';
import 'package:mobile/src/core/widgets/protocol_text.dart';
import 'package:mobile/src/features/tickets/domain/repositories/tickets_repository.dart';
import 'package:mobile/src/features/tickets/domain/ticket_changed_signal.dart';
import 'package:mobile/src/features/tickets/presentation/cubit/ticket_detail_cubit.dart';
import 'package:mobile/src/features/tickets/presentation/widgets/ticket_photos.dart';
import 'package:mobile/src/features/tickets/presentation/widgets/ticket_timeline.dart';
import 'package:mobile/src/shared/domain/entities/ticket.dart';
import 'package:mobile/src/shared/domain/enums/timeline_event_type.dart';
import 'package:mobile/src/shared/presentation/widgets/ticket_status_chip.dart';

/// A.6 Detalhe do chamado: dados da abertura, setor responsável atual e
/// linha do tempo. Só leitura: sem editar, reabrir ou comentar (fora do
/// escopo). Não mostra a divergência sugerido x escolhido (visão do setor).
class TicketDetailPage extends StatelessWidget {
  const TicketDetailPage({required this.ticketId, super.key});

  /// UUID do chamado (`id` da API).
  final String ticketId;

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (context) => TicketDetailCubit(
        repository: context.read<TicketsRepository>(),
        ticketId: ticketId,
      )..load(),
      child: const _TicketDetailView(),
    );
  }
}

class _TicketDetailView extends StatefulWidget {
  const _TicketDetailView();

  @override
  State<_TicketDetailView> createState() => _TicketDetailViewState();
}

class _TicketDetailViewState extends State<_TicketDetailView> {
  StreamSubscription<String>? _changes;

  @override
  void initState() {
    super.initState();
    // Push recebido com o app aberto para este chamado: recarrega.
    final cubit = context.read<TicketDetailCubit>();
    _changes = context.maybeRead<TicketChangedSignal>()?.stream.listen((id) {
      if (id == cubit.ticketId) cubit.refresh();
    });
  }

  @override
  void dispose() {
    _changes?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final cubit = context.read<TicketDetailCubit>();

    return Scaffold(
      appBar: AppBar(title: const Text(AppStrings.ticketDetailTitle)),
      body: BlocConsumer<TicketDetailCubit, TicketDetailState>(
        listenWhen: (_, current) =>
            current is TicketDetailLoaded && current.refreshFailure != null,
        listener: (context, state) => AppSnackbar.failure(
          context,
          (state as TicketDetailLoaded).refreshFailure!,
        ),
        builder: (context, state) => switch (state) {
          TicketDetailLoading() => const LoadingView(),
          TicketDetailFailure(:final failure) => ErrorView(
            message: failure.message,
            onRetry: cubit.load,
          ),
          TicketDetailNotFound() => EmptyView(
            icon: Icons.search_off,
            message:
                '${AppStrings.detailNotFound}\n${AppStrings.detailNotFoundHint}',
            action: AppButton.secondary(
              label: AppStrings.back,
              icon: Icons.arrow_back,
              expanded: false,
              onPressed: () => Navigator.of(context).maybePop(),
            ),
          ),
          TicketDetailLoaded(:final ticket) => RefreshIndicator(
            onRefresh: cubit.refresh,
            child: _TicketContent(ticket: ticket),
          ),
        },
      ),
    );
  }
}

class _TicketContent extends StatelessWidget {
  const _TicketContent({required this.ticket});

  final TicketDetail ticket;

  @override
  Widget build(BuildContext context) {
    final openedAt = ticket.timeline
        .where((event) => event.type == TimelineEventType.ticketOpened)
        .map((event) => event.createdAt)
        .firstOrNull;

    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(
        AppSpacing.lg,
        AppSpacing.lg,
        AppSpacing.lg,
        AppSpacing.xxl,
      ),
      children: [
        // Cabeçalho: protocolo + status (o chip desce com fonte grande).
        Wrap(
          alignment: WrapAlignment.spaceBetween,
          crossAxisAlignment: WrapCrossAlignment.center,
          spacing: AppSpacing.sm,
          children: [
            ProtocolText(
              ticket.protocol,
              style: context.textStyles.headlineSmall,
            ),
            TicketStatusChip(ticket.status),
          ],
        ),
        if (openedAt != null) ...[
          const SizedBox(height: AppSpacing.xs),
          Text(
            AppStrings.detailOpenedAt(AppDateFormatter.dateTime(openedAt)),
            style: context.textStyles.bodySmall?.copyWith(
              color: context.colors.onSurfaceVariant,
            ),
          ),
        ],
        const SizedBox(height: AppSpacing.lg),
        _CurrentSectorCard(sector: ticket.currentSector.name),
        const SizedBox(height: AppSpacing.xl),
        _Section(
          title: AppStrings.detailDescription,
          child: SelectableText(
            ticket.description,
            style: context.textStyles.bodyLarge,
          ),
        ),
        _Section(
          title: AppStrings.detailLocation,
          child: Row(
            children: [
              Icon(
                Icons.place_outlined,
                size: 20,
                color: context.colors.onSurfaceVariant,
              ),
              const SizedBox(width: AppSpacing.sm),
              Expanded(
                child: Text(
                  '${ticket.location.building.name} · '
                  '${ticket.location.environment.name}',
                  style: context.textStyles.bodyLarge,
                ),
              ),
            ],
          ),
        ),
        if (ticket.photos.isNotEmpty)
          _Section(
            title: '${AppStrings.detailPhotos} (${ticket.photos.length})',
            child: TicketPhotoGrid(photos: ticket.photos),
          ),
        _Section(
          title: AppStrings.detailTimeline,
          child: TicketTimeline(events: ticket.timeline),
        ),
      ],
    );
  }
}

/// Setor atual em destaque: sempre o mais recente, mesmo após reencaminhar.
class _CurrentSectorCard extends StatelessWidget {
  const _CurrentSectorCard({required this.sector});

  final String sector;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      container: true,
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: context.colors.primaryContainer,
          borderRadius: BorderRadius.circular(AppRadius.card),
        ),
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.lg),
          child: Row(
            children: [
              Icon(
                Icons.apartment_outlined,
                color: context.colors.onPrimaryContainer,
              ),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      AppStrings.detailCurrentSector,
                      style: context.textStyles.labelMedium?.copyWith(
                        color: context.colors.onPrimaryContainer,
                      ),
                    ),
                    Text(
                      sector,
                      style: context.textStyles.titleLarge?.copyWith(
                        color: context.colors.onPrimaryContainer,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Section extends StatelessWidget {
  const _Section({required this.title, required this.child});

  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.xl),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Semantics(
            header: true,
            child: Text(title, style: context.textStyles.titleMedium),
          ),
          const SizedBox(height: AppSpacing.sm),
          child,
        ],
      ),
    );
  }
}
