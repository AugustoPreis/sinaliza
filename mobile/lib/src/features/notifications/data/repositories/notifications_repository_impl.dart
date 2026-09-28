import 'package:mobile/src/core/errors/app_failure.dart';
import 'package:mobile/src/features/notifications/data/datasources/notifications_remote_datasource.dart';
import 'package:mobile/src/features/notifications/domain/repositories/notifications_repository.dart';
import 'package:mobile/src/shared/domain/entities/app_notification.dart';
import 'package:mobile/src/shared/domain/entities/paged_result.dart';

class NotificationsRepositoryImpl implements NotificationsRepository {
  NotificationsRepositoryImpl(this._remote);

  final NotificationsRemoteDataSource _remote;

  @override
  Future<PagedResult<AppNotification>> getNotifications({
    required int page,
  }) async {
    try {
      return await _remote.fetchNotifications(
        page: page,
        perPage: NotificationsRepository.pageSize,
      );
    } on FormatException {
      throw const UnknownFailure();
    }
  }

  @override
  Future<int> getUnreadCount() async {
    try {
      return await _remote.fetchUnreadCount();
    } on FormatException {
      throw const UnknownFailure();
    }
  }

  @override
  Future<void> markAllRead() => _remote.markAllRead();
}
