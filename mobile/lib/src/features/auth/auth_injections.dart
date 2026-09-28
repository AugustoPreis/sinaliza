import 'package:mobile/src/core/utils/injections.dart';
import 'package:mobile/src/features/auth/data/datasources/auth_remote_datasource.dart';
import 'package:mobile/src/features/auth/data/repositories/auth_repository_impl.dart';
import 'package:mobile/src/features/auth/domain/repositories/auth_repository.dart';
import 'package:mobile/src/features/auth/presentation/cubit/session_cubit.dart';
import 'package:mobile/src/features/push/application/push_coordinator.dart';

void initAuthInjections() {
  sl
    ..registerLazySingleton<AuthRemoteDataSource>(
      () => AuthRemoteDataSource(sl()),
    )
    ..registerLazySingleton<AuthRepository>(() => AuthRepositoryImpl(sl()))
    // Global: vive o app todo e escuta `SessionExpired` da camada de rede.
    ..registerLazySingleton<SessionCubit>(
      () => SessionCubit(
        repository: sl(),
        sessionEvents: sl(),
        // Remove o push token enquanto a sessão ainda vale (task 15).
        beforeLogout: () => sl<PushCoordinator>().beforeLogout(),
      ),
      dispose: (cubit) => cubit.close(),
    );
}
