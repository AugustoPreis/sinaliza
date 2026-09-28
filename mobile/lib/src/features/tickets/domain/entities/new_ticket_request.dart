import 'package:equatable/equatable.dart';
import 'package:mobile/src/shared/domain/entities/report_photo.dart';

/// Dados de `POST /tickets` (tela A.4).
class NewTicketRequest extends Equatable {
  const NewTicketRequest({
    required this.description,
    required this.buildingId,
    required this.environmentId,
    required this.automaticSectorId,
    required this.confirmedSectorId,
    this.photos = const [],
  });

  final String description;
  final String buildingId;
  final String environmentId;

  /// Setor devolvido pela classificação, **nunca** o escolhido (RB-03).
  final String? automaticSectorId;

  /// Setor escolhido em "Enviar para" (igual ao automático se confirmou).
  final String confirmedSectorId;
  final List<ReportPhoto> photos;

  bool get hasPhotos => photos.isNotEmpty;

  @override
  List<Object?> get props => [
    description,
    buildingId,
    environmentId,
    automaticSectorId,
    confirmedSectorId,
    photos,
  ];
}
