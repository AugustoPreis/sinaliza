import 'package:mobile/src/core/network/api_client.dart';
import 'package:mobile/src/core/utils/json.dart';
import 'package:mobile/src/shared/data/models/notification_model.dart';
import 'package:mobile/src/shared/data/models/paged_result_model.dart';
import 'package:mobile/src/shared/domain/entities/app_notification.dart';
import 'package:mobile/src/shared/domain/entities/paged_result.dart';

/// Histórico de notificações do solicitante. Lança `AppFailure` ou
/// `FormatException`.
class NotificationsRemoteDataSource {
  NotificationsRemoteDataSource(this._client);

  final ApiClient _client;

  static const notificationsPath = '/notifications';

  /// `GET /notifications?page=&perPage=`. A resposta traz `page_size`.
  Future<PagedResult<AppNotification>> fetchNotifications({
    required int page,
    required int perPage,
  }) async {
    final data = await _client.get<Object?>(
      notificationsPath,
      queryParameters: {'page': page, 'perPage': perPage},
    );
    return PagedResultModel.fromJson(
      asJson(data),
      AppNotificationModel.fromJson,
    );
  }

  /// `GET /notifications/unread-count` -> `{count}`.
  Future<int> fetchUnreadCount() async {
    final data = await _client.get<Object?>('$notificationsPath/unread-count');
    final count = asJson(data)['count'];
    if (count is! int) throw const FormatException('count ausente');
    return count;
  }

  /// `POST /notifications/read`: marca todas como lidas (204).
  Future<void> markAllRead() =>
      _client.post<Object?>('$notificationsPath/read');
}
