import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:mobile/src/core/errors/app_failure.dart';
import 'package:mobile/src/core/l10n/app_strings.dart';
import 'package:mobile/src/features/new_report/data/services/photo_picker.dart';
import 'package:mobile/src/features/new_report/data/services/photo_processor.dart';
import 'package:mobile/src/shared/domain/entities/report_photo.dart';
import 'package:mobile/src/features/new_report/domain/repositories/classification_repository.dart';
import 'package:mobile/src/features/new_report/presentation/cubit/new_report_state.dart';
import 'package:mobile/src/features/reference_data/domain/repositories/reference_data_repositories.dart';
import 'package:mobile/src/shared/domain/entities/building.dart';

export 'package:mobile/src/features/new_report/presentation/cubit/new_report_state.dart';

/// Estado do fluxo A.3 -> A.4 -> A.5. Criado ao abrir a A.3 e fechado quando
/// o fluxo termina ou é cancelado (apaga as fotos temporárias).
class NewReportCubit extends Cubit<NewReportState> {
  NewReportCubit({
    required LocationsRepository locations,
    required ClassificationRepository classification,
    required PhotoPicker photoPicker,
    required PhotoProcessor photoProcessor,
  }) : _locations = locations,
       _classification = classification,
       _picker = photoPicker,
       _processor = photoProcessor,
       super(const NewReportState());

  final LocationsRepository _locations;
  final ClassificationRepository _classification;
  final PhotoPicker _picker;
  final PhotoProcessor _processor;
  int _noticeId = 0;

  // ---------------------------------------------------------------- Local

  Future<void> loadLocations({bool forceRefresh = false}) async {
    emit(
      state.copyWith(
        locationsStatus: LocationsStatus.loading,
        locationsFailure: () => null,
      ),
    );
    try {
      final buildings = await _locations.getBuildings(
        forceRefresh: forceRefresh,
      );
      if (isClosed) return;
      emit(
        state.copyWith(
          locationsStatus: LocationsStatus.ready,
          buildings: buildings,
        ),
      );
    } on AppFailure catch (failure) {
      if (isClosed) return;
      emit(
        state.copyWith(
          locationsStatus: LocationsStatus.failure,
          locationsFailure: () => failure,
        ),
      );
    }
  }

  /// Trocar o prédio limpa o ambiente.
  void selectBuilding(Building building) {
    final changed = state.building?.id != building.id;
    emit(
      state.copyWith(
        building: () => building,
        environment: changed ? () => null : null,
      ),
    );
  }

  void selectEnvironment(Environment environment) {
    emit(state.copyWith(environment: () => environment));
  }

  // ------------------------------------------------------------ Descrição

  void descriptionChanged(String description) {
    emit(
      state.copyWith(
        description: description,
        // Um erro antigo não vale para o texto novo.
        classifyStatus: state.isClassifying ? null : ClassifyStatus.idle,
        classifyFailure: () => null,
      ),
    );
  }

  // ---------------------------------------------------------------- Fotos

  Future<void> addPhotos(PhotoSource source) async {
    if (state.isProcessingPhotos) return;
    final remaining = state.remainingPhotos;
    if (remaining <= 0) {
      _message(AppStrings.reportPhotoLimitReached);
      return;
    }

    final List<String> picked;
    try {
      picked = switch (source) {
        PhotoSource.camera => [?await _picker.takePhoto()],
        PhotoSource.gallery => await _picker.pickFromGallery(limit: remaining),
      };
    } on PhotoPermissionDenied catch (denied) {
      _notice((id) => PermissionDeniedNotice(id, denied.source));
      return;
    } on Exception {
      _message(AppStrings.reportPhotoFailed);
      return;
    }
    if (picked.isEmpty || isClosed) return;

    // Algumas galerias ignoram o limite pedido.
    final accepted = picked.take(remaining).toList();
    emit(state.copyWith(isProcessingPhotos: true));

    final processed = <ReportPhoto>[];
    var failed = false;
    for (final path in accepted) {
      try {
        processed.add(await _processor.process(path));
      } on PhotoProcessingException {
        failed = true;
      }
    }

    if (isClosed) {
      processed.forEach(_processor.discard);
      return;
    }
    emit(
      state.copyWith(
        photos: List.unmodifiable([...state.photos, ...processed]),
        isProcessingPhotos: false,
      ),
    );
    if (failed) {
      _message(AppStrings.reportPhotoFailed);
    } else if (picked.length > accepted.length) {
      _message(AppStrings.reportPhotoLimitPartial(NewReportState.maxPhotos));
    }
  }

  void removePhoto(ReportPhoto photo) {
    emit(
      state.copyWith(
        photos: List.unmodifiable(state.photos.where((p) => p != photo)),
      ),
    );
    _processor.discard(photo);
  }

  // ------------------------------------------------------- Classificação

  /// "Continuar": classifica a descrição e devolve `true` se pode ir para a
  /// A.4. Se a descrição não mudou desde a última classificação, reaproveita
  /// o resultado. Em erro, tudo o que foi preenchido é mantido.
  Future<bool> classify() async {
    if (!state.canContinue) return false;
    if (!state.needsClassification) return true;

    final description = state.trimmedDescription;
    emit(
      state.copyWith(
        classifyStatus: ClassifyStatus.loading,
        classifyFailure: () => null,
      ),
    );
    try {
      // Só a descrição: local e fotos nunca vão para a classificação (RB-02).
      final result = await _classification.preview(description);
      if (isClosed) return false;
      emit(
        state.copyWith(
          classifyStatus: ClassifyStatus.idle,
          classification: () => result,
          classifiedDescription: () => description,
        ),
      );
      return true;
    } on AppFailure catch (failure) {
      if (isClosed) return false;
      emit(
        state.copyWith(
          classifyStatus: ClassifyStatus.failure,
          classifyFailure: () => failure,
        ),
      );
      return false;
    }
  }

  void _notice(ReportNotice Function(int id) build) {
    final notice = build(++_noticeId);
    emit(state.copyWith(notice: () => notice));
  }

  void _message(String text) => _notice((id) => PhotoNotice(id, text));

  @override
  Future<void> close() async {
    // Fotos comprimidas são temporárias; o envio (A.4) acontece antes.
    for (final photo in state.photos) {
      await _processor.discard(photo);
    }
    return super.close();
  }
}
