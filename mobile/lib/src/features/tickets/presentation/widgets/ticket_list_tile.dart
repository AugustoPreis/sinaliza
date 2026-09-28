import 'package:flutter/material.dart';
import 'package:mobile/src/core/l10n/app_strings.dart';
import 'package:mobile/src/core/styles/app_semantic_colors.dart';
import 'package:mobile/src/core/styles/app_spacing.dart';
import 'package:mobile/src/core/utils/formatters/date_formatter.dart';
import 'package:mobile/src/core/widgets/protocol_text.dart';
import 'package:mobile/src/shared/domain/entities/ticket.dart';
import 'package:mobile/src/shared/presentation/widgets/ticket_status_chip.dart';

/// Item da lista "Meus chamados": protocolo, status em destaque, resumo,
/// setor atual e data de abertura.
class TicketListTile extends StatelessWidget {
  const TicketListTile({required this.ticket, required this.onTap, super.key});

  final TicketListItem ticket;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final secondary = context.textStyles.bodySmall?.copyWith(
      color: context.colors.onSurfaceVariant,
    );
    final protocol = ProtocolText.format(ticket.protocol);

    return Semantics(
      button: true,
      label: AppStrings.ticketSemantics(
        protocol: protocol,
        status: ticket.status.label,
        sector: ticket.currentSector.name,
        summary: ticket.descriptionSummary,
      ),
      excludeSemantics: true,
      child: Card(
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.all(AppSpacing.lg),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Wrap: com fonte grande o chip desce para a linha de baixo.
                Wrap(
                  alignment: WrapAlignment.spaceBetween,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  spacing: AppSpacing.sm,
                  runSpacing: AppSpacing.xs,
                  children: [
                    ProtocolText(
                      ticket.protocol,
                      copyable: false,
                      style: context.textStyles.titleSmall,
                    ),
                    TicketStatusChip(ticket.status),
                  ],
                ),
                const SizedBox(height: AppSpacing.sm),
                Text(
                  ticket.descriptionSummary,
                  maxLines: 3,
                  overflow: TextOverflow.ellipsis,
                  style: context.textStyles.bodyMedium,
                ),
                const SizedBox(height: AppSpacing.md),
                Wrap(
                  alignment: WrapAlignment.spaceBetween,
                  spacing: AppSpacing.sm,
                  runSpacing: AppSpacing.xs,
                  children: [
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          Icons.apartment_outlined,
                          size: 16,
                          color: context.colors.onSurfaceVariant,
                        ),
                        const SizedBox(width: AppSpacing.xs),
                        Flexible(
                          child: Text(
                            ticket.currentSector.name,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: secondary,
                          ),
                        ),
                      ],
                    ),
                    Tooltip(
                      message: AppDateFormatter.dateTime(ticket.createdAt),
                      child: Text(
                        AppStrings.ticketOpenedAt(
                          AppDateFormatter.relativeShort(ticket.createdAt),
                        ),
                        style: secondary,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
