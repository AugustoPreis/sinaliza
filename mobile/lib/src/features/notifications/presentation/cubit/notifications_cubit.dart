import 'package:mobile/src/core/pagination/paged_list_cubit.dart';
import 'package:mobile/src/features/notifications/domain/repositories/notifications_repository.dart';
import 'package:mobile/src/shared/domain/entities/app_notification.dart';
import 'package:mobile/src/shared/domain/entities/paged_result.dart';

export 'package:mobile/src/core/pagination/paged_list_cubit.dart';

typedef NotificationsState = PagedListState<AppNotification>;

/// Histórico da A.7: rolagem infinita e pull-to-refresh.
class NotificationsCubit extends PagedListCubit<AppNotification> {
  NotificationsCubit({required NotificationsRepository repository})
    : _repository = repository;

  final NotificationsRepository _repository;

  @override
  Future<PagedResult<AppNotification>> fetchPage(int page) =>
      _repository.getNotifications(page: page);

  @override
  String idOf(AppNotification item) => item.id;
}
