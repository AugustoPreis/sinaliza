import 'package:mobile/src/core/errors/app_failure.dart';
import 'package:mobile/src/features/new_report/data/datasources/classification_remote_datasource.dart';
import 'package:mobile/src/features/new_report/domain/repositories/classification_repository.dart';
import 'package:mobile/src/shared/domain/entities/classification_result.dart';

class ClassificationRepositoryImpl implements ClassificationRepository {
  ClassificationRepositoryImpl(this._remote);

  final ClassificationRemoteDataSource _remote;

  @override
  Future<ClassificationResult> preview(String description) async {
    try {
      return await _remote.preview(description);
    } on FormatException {
      throw const UnknownFailure();
    }
  }
}
