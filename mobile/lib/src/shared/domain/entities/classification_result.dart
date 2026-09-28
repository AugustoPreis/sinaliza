import 'package:equatable/equatable.dart';
import 'package:mobile/src/shared/domain/entities/refs.dart';

/// Resultado de `POST /classification/preview`.
///
/// O campo `classification` (detalhes do modelo) é ignorado no app.
class ClassificationResult extends Equatable {
  const ClassificationResult({required this.automaticSector, this.confidence});

  final SectorRef? automaticSector;

  /// Entre 0 e 1, quando o classificador informa.
  final double? confidence;

  @override
  List<Object?> get props => [automaticSector, confidence];
}
