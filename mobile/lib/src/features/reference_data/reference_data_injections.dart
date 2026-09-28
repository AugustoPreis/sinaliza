import 'package:mobile/src/core/utils/injections.dart';
import 'package:mobile/src/features/reference_data/data/datasources/reference_data_remote_datasource.dart';
import 'package:mobile/src/features/reference_data/data/repositories/reference_data_repositories_impl.dart';
import 'package:mobile/src/features/reference_data/domain/repositories/reference_data_repositories.dart';

void initReferenceDataInjections() {
  sl
    ..registerLazySingleton<ReferenceDataRemoteDataSource>(
      () => ReferenceDataRemoteDataSource(sl()),
    )
    // Singletons: o cache vale para a sessão inteira.
    ..registerLazySingleton<LocationsRepository>(
      () => LocationsRepositoryImpl(sl(), sessionEvents: sl()),
      dispose: (repository) =>
          (repository as LocationsRepositoryImpl).dispose(),
    )
    ..registerLazySingleton<SectorsRepository>(
      () => SectorsRepositoryImpl(sl(), sessionEvents: sl()),
      dispose: (repository) => (repository as SectorsRepositoryImpl).dispose(),
    );
}
