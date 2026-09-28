import 'package:mobile/src/core/utils/injections.dart';
import 'package:mobile/src/features/tickets/data/datasources/tickets_remote_datasource.dart';
import 'package:mobile/src/features/tickets/data/repositories/tickets_repository_impl.dart';
import 'package:mobile/src/features/tickets/domain/repositories/tickets_repository.dart';

void initTicketsInjections() {
  sl
    ..registerLazySingleton<TicketsRemoteDataSource>(
      () => TicketsRemoteDataSource(sl()),
    )
    ..registerLazySingleton<TicketsRepository>(
      () => TicketsRepositoryImpl(sl()),
    );
}
