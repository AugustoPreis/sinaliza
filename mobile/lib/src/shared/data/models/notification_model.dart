import 'package:mobile/src/core/utils/json.dart';
import 'package:mobile/src/shared/domain/entities/app_notification.dart';
import 'package:mobile/src/shared/domain/enums/notification_type.dart';

abstract final class AppNotificationModel {
  static AppNotification fromJson(Json json) {
    return AppNotification(
      id: json.str('id'),
      ticketId: json.str('ticket_id'),
      protocol: json.str('protocol'),
      type: NotificationType.fromApi(json.strOrNull('type')),
      message: json.str('message'),
      createdAt: json.date('created_at'),
    );
  }
}
