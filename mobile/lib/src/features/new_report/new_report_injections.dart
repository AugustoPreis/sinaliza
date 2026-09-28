import 'package:mobile/src/core/utils/injections.dart';
import 'package:mobile/src/features/new_report/data/datasources/classification_remote_datasource.dart';
import 'package:mobile/src/features/new_report/data/repositories/classification_repository_impl.dart';
import 'package:mobile/src/features/new_report/data/services/photo_picker.dart';
import 'package:mobile/src/features/new_report/data/services/photo_processor.dart';
import 'package:mobile/src/features/new_report/domain/repositories/classification_repository.dart';

void initNewReportInjections() {
  sl
    ..registerLazySingleton<ClassificationRemoteDataSource>(
      () => ClassificationRemoteDataSource(sl()),
    )
    ..registerLazySingleton<ClassificationRepository>(
      () => ClassificationRepositoryImpl(sl()),
    )
    ..registerLazySingleton<PhotoPicker>(ImagePickerPhotoPicker.new)
    ..registerLazySingleton<PhotoProcessor>(ImageCompressPhotoProcessor.new);
}
