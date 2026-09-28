import 'package:mobile/src/shared/domain/entities/app_notification.dart';
import 'package:mobile/src/shared/domain/entities/paged_result.dart';

/// Histórico de notificações (tela A.7). Lança só `AppFailure`.
///
/// "Lida" é por conta, na API: abrir o histórico marca todas como lidas.
abstract interface class NotificationsRepository {
  static const int pageSize = 30;

  Future<PagedResult<AppNotification>> getNotifications({required int page});

  /// Quantidade de notificações não lidas (bolinha na aba).
  Future<int> getUnreadCount();

  Future<void> markAllRead();
}
