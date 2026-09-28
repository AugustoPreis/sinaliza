import 'package:flutter/material.dart';
import 'package:mobile/src/core/styles/app_semantic_colors.dart';
import 'package:mobile/src/core/styles/app_spacing.dart';
import 'package:mobile/src/shared/domain/enums/ticket_status.dart';

/// Rótulo colorido do status do chamado (A.2, A.6, A.7).
class TicketStatusChip extends StatelessWidget {
  const TicketStatusChip(this.status, {super.key});

  final TicketStatus status;

  /// Cores por status: Aberto neutro, Encaminhado info, Em andamento
  /// warning, Resolvido success (mesmo mapeamento do portal web).
  static ColorPair colorsFor(TicketStatus status, AppSemanticColors colors) {
    return switch (status) {
      TicketStatus.open || TicketStatus.unknown => colors.neutralContainer,
      TicketStatus.forwarded => colors.infoContainer,
      TicketStatus.inProgress => colors.warningContainer,
      TicketStatus.resolved => colors.successContainer,
    };
  }

  @override
  Widget build(BuildContext context) {
    final pair = colorsFor(status, context.appColors);

    return DecoratedBox(
      decoration: BoxDecoration(
        color: pair.background,
        borderRadius: BorderRadius.circular(AppRadius.pill),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.md,
          vertical: AppSpacing.xs,
        ),
        child: Text(
          status.label,
          style: context.textStyles.labelSmall?.copyWith(
            color: pair.foreground,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
    );
  }
}
