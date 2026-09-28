import 'package:mobile/src/shared/domain/entities/classification_result.dart';

/// Classificação automática do relato. Lança só `AppFailure`.
abstract interface class ClassificationRepository {
  /// Setor sugerido para [description]. Não cria chamado.
  Future<ClassificationResult> preview(String description);
}
