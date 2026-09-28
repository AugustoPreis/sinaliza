import 'package:equatable/equatable.dart';
import 'package:mobile/src/core/errors/app_failure.dart';
import 'package:mobile/src/features/new_report/data/services/photo_picker.dart';
import 'package:mobile/src/shared/domain/entities/report_photo.dart';
import 'package:mobile/src/shared/domain/entities/building.dart';
import 'package:mobile/src/shared/domain/entities/classification_result.dart';

enum LocationsStatus { loading, ready, failure }

enum ClassifyStatus { idle, loading, failure }

/// Aviso pontual para a tela (snackbar/diálogo). O [id] distingue avisos
/// iguais emitidos em sequência.
sealed class ReportNotice extends Equatable {
  const ReportNotice(this.id);

  final int id;

  @override
  List<Object?> get props => [id];
}

final class PhotoNotice extends ReportNotice {
  const PhotoNotice(super.id, this.message);

  final String message;

  @override
  List<Object?> get props => [id, message];
}

final class PermissionDeniedNotice extends ReportNotice {
  const PermissionDeniedNotice(super.id, this.source);

  final PhotoSource source;

  @override
  List<Object?> get props => [id, source];
}

/// Estado do fluxo de novo relato (A.3 -> A.4 -> A.5).
class NewReportState extends Equatable {
  const NewReportState({
    this.description = '',
    this.locationsStatus = LocationsStatus.loading,
    this.buildings = const [],
    this.locationsFailure,
    this.building,
    this.environment,
    this.photos = const [],
    this.isProcessingPhotos = false,
    this.classifyStatus = ClassifyStatus.idle,
    this.classification,
    this.classifiedDescription,
    this.classifyFailure,
    this.notice,
  });

  static const int maxDescriptionLength = 2000;
  static const int maxPhotos = 5;

  final String description;

  final LocationsStatus locationsStatus;
  final List<Building> buildings;
  final AppFailure? locationsFailure;
  final Building? building;
  final Environment? environment;

  /// Já comprimidas.
  final List<ReportPhoto> photos;
  final bool isProcessingPhotos;

  final ClassifyStatus classifyStatus;

  /// Resultado de `POST /classification/preview`; `automaticSector` é o que
  /// vai como `automatic_sector_id` no envio (RB-03).
  final ClassificationResult? classification;

  /// Descrição que gerou [classification]. Se o texto mudar, classifica de novo.
  final String? classifiedDescription;
  final AppFailure? classifyFailure;
  final ReportNotice? notice;

  /// Texto enviado à API (sem espaços nas pontas).
  String get trimmedDescription => description.trim();

  bool get isDescriptionValid =>
      trimmedDescription.isNotEmpty &&
      trimmedDescription.length <= maxDescriptionLength;

  bool get isLocationValid => building != null && environment != null;

  bool get isClassifying => classifyStatus == ClassifyStatus.loading;

  bool get canContinue =>
      isDescriptionValid &&
      isLocationValid &&
      !isClassifying &&
      !isProcessingPhotos;

  bool get needsClassification =>
      classification == null || classifiedDescription != trimmedDescription;

  int get remainingPhotos => maxPhotos - photos.length;

  /// Algo foi preenchido: sair pede confirmação.
  bool get hasUnsavedData =>
      trimmedDescription.isNotEmpty || building != null || photos.isNotEmpty;

  NewReportState copyWith({
    String? description,
    LocationsStatus? locationsStatus,
    List<Building>? buildings,
    AppFailure? Function()? locationsFailure,
    Building? Function()? building,
    Environment? Function()? environment,
    List<ReportPhoto>? photos,
    bool? isProcessingPhotos,
    ClassifyStatus? classifyStatus,
    ClassificationResult? Function()? classification,
    String? Function()? classifiedDescription,
    AppFailure? Function()? classifyFailure,
    ReportNotice? Function()? notice,
  }) {
    return NewReportState(
      description: description ?? this.description,
      locationsStatus: locationsStatus ?? this.locationsStatus,
      buildings: buildings ?? this.buildings,
      locationsFailure: locationsFailure != null
          ? locationsFailure()
          : this.locationsFailure,
      building: building != null ? building() : this.building,
      environment: environment != null ? environment() : this.environment,
      photos: photos ?? this.photos,
      isProcessingPhotos: isProcessingPhotos ?? this.isProcessingPhotos,
      classifyStatus: classifyStatus ?? this.classifyStatus,
      classification: classification != null
          ? classification()
          : this.classification,
      classifiedDescription: classifiedDescription != null
          ? classifiedDescription()
          : this.classifiedDescription,
      classifyFailure: classifyFailure != null
          ? classifyFailure()
          : this.classifyFailure,
      notice: notice != null ? notice() : this.notice,
    );
  }

  @override
  List<Object?> get props => [
    description,
    locationsStatus,
    buildings,
    locationsFailure,
    building,
    environment,
    photos,
    isProcessingPhotos,
    classifyStatus,
    classification,
    classifiedDescription,
    classifyFailure,
    notice,
  ];
}
