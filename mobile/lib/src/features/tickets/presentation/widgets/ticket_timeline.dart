import 'package:flutter/material.dart';
import 'package:mobile/src/core/styles/app_colors.dart';
import 'package:mobile/src/core/styles/app_semantic_colors.dart';
import 'package:mobile/src/core/styles/app_spacing.dart';
import 'package:mobile/src/core/utils/formatters/date_formatter.dart';
import 'package:mobile/src/shared/domain/entities/ticket.dart';
import 'package:mobile/src/shared/domain/enums/timeline_event_type.dart';

/// Linha do tempo do chamado, do evento **mais recente para o mais antigo**
/// (o que o solicitante quer ver primeiro é a última novidade). A API manda
/// em ordem cronológica; a inversão é só de exibição.
///
/// O texto de cada evento vem pronto da API (`description`, em pt-BR).
/// Reencaminhamentos (`REASSIGNED`) ficam em destaque.
class TicketTimeline extends StatelessWidget {
  const TicketTimeline({required this.events, super.key});

  final List<TimelineEvent> events;

  @override
  Widget build(BuildContext context) {
    final ordered = events.reversed.toList();
    return Column(
      children: [
        for (final (index, event) in ordered.indexed)
          _TimelineTile(
            event: event,
            isFirst: index == 0,
            isLast: index == ordered.length - 1,
          ),
      ],
    );
  }
}

/// Visual por tipo de evento: (ícone, cores).
({IconData icon, ColorPair colors, bool highlight}) timelineStyle(
  TimelineEventType type,
  BuildContext context,
) {
  final semantic = context.appColors;
  final neutral = ColorPair(
    context.colors.surfaceContainerHighest,
    context.colors.onSurfaceVariant,
  );
  final primary = ColorPair(
    context.colors.primaryContainer,
    context.colors.onPrimaryContainer,
  );

  return switch (type) {
    TimelineEventType.ticketOpened => (
      icon: Icons.flag_outlined,
      colors: primary,
      highlight: false,
    ),
    TimelineEventType.autoClassified => (
      icon: Icons.auto_awesome_outlined,
      colors: neutral,
      highlight: false,
    ),
    TimelineEventType.requesterConfirmedSector => (
      icon: Icons.how_to_reg_outlined,
      colors: neutral,
      highlight: false,
    ),
    TimelineEventType.requesterChangedSector => (
      icon: Icons.swap_horiz,
      colors: neutral,
      highlight: false,
    ),
    TimelineEventType.statusChanged => (
      icon: Icons.sync,
      colors: semantic.infoContainer,
      highlight: false,
    ),
    TimelineEventType.reassigned => (
      icon: Icons.forward,
      colors: semantic.warningContainer,
      highlight: true,
    ),
    TimelineEventType.ticketResolved => (
      icon: Icons.task_alt,
      colors: semantic.successContainer,
      highlight: false,
    ),
    TimelineEventType.unknown => (
      icon: Icons.circle_outlined,
      colors: neutral,
      highlight: false,
    ),
  };
}

class _TimelineTile extends StatelessWidget {
  const _TimelineTile({
    required this.event,
    required this.isFirst,
    required this.isLast,
  });

  final TimelineEvent event;
  final bool isFirst;
  final bool isLast;

  @override
  Widget build(BuildContext context) {
    final style = timelineStyle(event.type, context);
    final when = AppDateFormatter.dateTime(event.createdAt);
    final line = context.colors.outlineVariant;

    final text = Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          event.description,
          style: context.textStyles.bodyMedium?.copyWith(
            fontWeight: style.highlight || isFirst ? FontWeight.w600 : null,
            color: style.highlight ? style.colors.foreground : null,
          ),
        ),
        const SizedBox(height: AppSpacing.xxs),
        Text(
          when,
          style: context.textStyles.bodySmall?.copyWith(
            color: style.highlight
                ? style.colors.foreground
                : context.colors.onSurfaceVariant,
          ),
        ),
      ],
    );

    return Semantics(
      container: true,
      label: '${event.description} $when',
      excludeSemantics: true,
      child: IntrinsicHeight(
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            SizedBox(
              width: 40,
              child: Column(
                children: [
                  Container(
                    width: 2,
                    height: AppSpacing.sm,
                    color: isFirst ? AppColors.transparent : line,
                  ),
                  CircleAvatar(
                    radius: 16,
                    backgroundColor: style.colors.background,
                    child: Icon(
                      style.icon,
                      size: 18,
                      color: style.colors.foreground,
                    ),
                  ),
                  Expanded(
                    child: Container(
                      width: 2,
                      color: isLast ? AppColors.transparent : line,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: AppSpacing.md),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.only(
                  top: AppSpacing.sm,
                  bottom: AppSpacing.lg,
                ),
                child: style.highlight
                    ? DecoratedBox(
                        decoration: BoxDecoration(
                          color: style.colors.background,
                          borderRadius: BorderRadius.circular(
                            AppRadius.control,
                          ),
                        ),
                        child: Padding(
                          padding: const EdgeInsets.all(AppSpacing.md),
                          child: text,
                        ),
                      )
                    : text,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
