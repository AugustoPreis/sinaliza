import 'package:mobile/src/core/utils/injections.dart';
import 'package:mobile/src/features/notifications/data/datasources/notifications_remote_datasource.dart';
import 'package:mobile/src/features/notifications/data/repositories/notifications_repository_impl.dart';
import 'package:mobile/src/features/notifications/domain/notifications_refresh_signal.dart';
import 'package:mobile/src/features/notifications/domain/repositories/notifications_repository.dart';

void initNotificationsInjections() {
  sl
    ..registerLazySingleton<NotificationsRemoteDataSource>(
      () => NotificationsRemoteDataSource(sl()),
    )
    ..registerLazySingleton<NotificationsRepository>(
      () => NotificationsRepositoryImpl(sl()),
    )
    ..registerLazySingleton<NotificationsRefreshSignal>(
      NotificationsRefreshSignal.new,
      dispose: (signal) => signal.dispose(),
    );
}
