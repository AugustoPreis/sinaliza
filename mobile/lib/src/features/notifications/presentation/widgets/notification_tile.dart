import 'package:flutter/material.dart';
import 'package:mobile/src/core/l10n/app_strings.dart';
import 'package:mobile/src/core/styles/app_semantic_colors.dart';
import 'package:mobile/src/core/styles/app_spacing.dart';
import 'package:mobile/src/core/utils/formatters/date_formatter.dart';
import 'package:mobile/src/core/widgets/protocol_text.dart';
import 'package:mobile/src/shared/domain/entities/app_notification.dart';
import 'package:mobile/src/shared/domain/enums/notification_type.dart';

/// Item do histórico: ícone por tipo, mensagem (pronta da API), protocolo e
/// data relativa. Toque abre o chamado.
class NotificationTile extends StatelessWidget {
  const NotificationTile({
    required this.notification,
    required this.onTap,
    super.key,
  });

  final AppNotification notification;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final semantic = context.appColors;
    final (IconData icon, ColorPair colors) = switch (notification.type) {
      NotificationType.ticketStatusChanged => (
        Icons.sync,
        semantic.infoContainer,
      ),
      NotificationType.ticketReassigned => (
        Icons.forward,
        semantic.warningContainer,
      ),
      NotificationType.ticketResolved => (
        Icons.task_alt,
        semantic.successContainer,
      ),
      NotificationType.unknown => (
        Icons.notifications_outlined,
        semantic.neutralContainer,
      ),
    };
    final when = AppDateFormatter.relativeShort(notification.createdAt);
    final protocol = ProtocolText.format(notification.protocol);

    return Semantics(
      button: true,
      label: AppStrings.notificationSemantics(
        message: notification.message,
        protocol: protocol,
        when: when,
      ),
      excludeSemantics: true,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.lg,
            vertical: AppSpacing.md,
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              CircleAvatar(
                radius: 20,
                backgroundColor: colors.background,
                child: Icon(icon, size: 20, color: colors.foreground),
              ),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      notification.message,
                      maxLines: 3,
                      overflow: TextOverflow.ellipsis,
                      style: context.textStyles.bodyMedium,
                    ),
                    const SizedBox(height: AppSpacing.xs),
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            protocol,
                            style: context.textStyles.labelMedium?.copyWith(
                              color: context.colors.primary,
                            ),
                          ),
                        ),
                        Tooltip(
                          message: AppDateFormatter.dateTime(
                            notification.createdAt,
                          ),
                          child: Text(
                            when,
                            style: context.textStyles.bodySmall?.copyWith(
                              color: context.colors.onSurfaceVariant,
                            ),
                          ),
                        ),
                      ],
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
