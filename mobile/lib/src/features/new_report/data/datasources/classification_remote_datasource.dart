import 'package:mobile/src/core/network/api_client.dart';
import 'package:mobile/src/core/utils/json.dart';
import 'package:mobile/src/shared/data/models/reference_models.dart';
import 'package:mobile/src/shared/domain/entities/classification_result.dart';

/// `POST /classification/preview`. Lança `AppFailure` ou `FormatException`.
class ClassificationRemoteDataSource {
  ClassificationRemoteDataSource(this._client);

  final ApiClient _client;

  static const previewPath = '/classification/preview';

  /// Envia **somente** a descrição. Local e fotos nunca vão para a
  /// classificação (RB-02).
  Future<ClassificationResult> preview(String description) async {
    final data = await _client.post<Object?>(
      previewPath,
      data: {'description': description},
    );
    return ClassificationResultModel.fromJson(asJson(data));
  }
}
