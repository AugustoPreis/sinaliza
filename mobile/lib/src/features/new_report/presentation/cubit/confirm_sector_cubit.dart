import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:mobile/src/core/errors/app_failure.dart';
import 'package:mobile/src/core/l10n/app_strings.dart';
import 'package:mobile/src/features/new_report/presentation/cubit/new_report_state.dart';
import 'package:mobile/src/features/reference_data/domain/repositories/reference_data_repositories.dart';
import 'package:mobile/src/features/tickets/domain/entities/new_ticket_request.dart';
import 'package:mobile/src/features/tickets/domain/repositories/tickets_repository.dart';
import 'package:mobile/src/shared/domain/entities/refs.dart';
import 'package:mobile/src/shared/domain/entities/ticket.dart';

enum SectorsStatus { loading, ready, failure }

class ConfirmSectorState extends Equatable {
  const ConfirmSectorState({
    required this.suggestion,
    required this.selected,
    this.sectorsStatus = SectorsStatus.loading,
    this.sectors = const [],
    this.isSubmitting = false,
    this.progress,
    this.submitError,
    this.created,
  });

  /// Setor da classificação (somente leitura).
  final SectorRef? suggestion;

  /// "Enviar para": começa igual à sugestão.
  final SectorRef? selected;
  final SectorsStatus sectorsStatus;
  final List<SectorRef> sectors;
  final bool isSubmitting;

  /// 0 a 1 durante o envio das fotos.
  final double? progress;
  final String? submitError;

  /// Preenchido quando o chamado foi criado.
  final TicketCreated? created;

  bool get changedSuggestion =>
      suggestion != null && selected != null && selected!.id != suggestion!.id;
  bool get canSubmit => selected != null && !isSubmitting;

  ConfirmSectorState copyWith({
    SectorRef? selected,
    SectorsStatus? sectorsStatus,
    List<SectorRef>? sectors,
    bool? isSubmitting,
    double? Function()? progress,
    String? Function()? submitError,
    TicketCreated? Function()? created,
  }) {
    return ConfirmSectorState(
      suggestion: suggestion,
      selected: selected ?? this.selected,
      sectorsStatus: sectorsStatus ?? this.sectorsStatus,
      sectors: sectors ?? this.sectors,
      isSubmitting: isSubmitting ?? this.isSubmitting,
      progress: progress != null ? progress() : this.progress,
      submitError: submitError != null ? submitError() : this.submitError,
      created: created != null ? created() : this.created,
    );
  }

  @override
  List<Object?> get props => [
    suggestion,
    selected,
    sectorsStatus,
    sectors,
    isSubmitting,
    progress,
    submitError,
    created,
  ];
}

/// A.4: confirma ou troca o setor sugerido e cria o chamado.
///
/// O relato (descrição, local, fotos, classificação) vem do
/// [NewReportState] do fluxo, lido no momento do envio.
class ConfirmSectorCubit extends Cubit<ConfirmSectorState> {
  ConfirmSectorCubit({
    required NewReportState Function() report,
    required SectorsRepository sectors,
    required TicketsRepository tickets,
  }) : _report = report,
       _sectors = sectors,
       _tickets = tickets,
       super(
         ConfirmSectorState(
           suggestion: report().classification!.automaticSector,
           selected: report().classification!.automaticSector,
         ),
       );

  final NewReportState Function() _report;
  final SectorsRepository _sectors;
  final TicketsRepository _tickets;

  Future<void> loadSectors({bool forceRefresh = false}) async {
    emit(state.copyWith(sectorsStatus: SectorsStatus.loading));
    try {
      final sectors = await _sectors.getSectors(forceRefresh: forceRefresh);
      if (isClosed) return;
      // A sugestão sempre aparece na lista, mesmo se o cache estiver velho.
      final suggestion = state.suggestion;
      final hasSuggestion =
          suggestion == null || sectors.any((s) => s.id == suggestion.id);
      emit(
        state.copyWith(
          selected: state.selected ?? (sectors.isEmpty ? null : sectors.first),
          sectorsStatus: SectorsStatus.ready,
          sectors: hasSuggestion ? sectors : [suggestion, ...sectors],
        ),
      );
    } on AppFailure {
      if (isClosed) return;
      // Sem a lista ainda dá para enviar para o setor sugerido.
      emit(state.copyWith(sectorsStatus: SectorsStatus.failure));
    }
  }

  void select(SectorRef sector) {
    if (state.isSubmitting) return;
    emit(state.copyWith(selected: sector, submitError: () => null));
  }

  /// Cria o chamado. Ignora toques repetidos enquanto envia.
  Future<TicketCreated?> submit() async {
    if (state.isSubmitting || state.created != null) return state.created;

    final report = _report();
    final classification = report.classification;
    final building = report.building;
    final environment = report.environment;
    if (classification == null ||
        building == null ||
        environment == null ||
        state.selected == null) {
      return null;
    }

    final request = NewTicketRequest(
      description: report.trimmedDescription,
      buildingId: building.id,
      environmentId: environment.id,
      // RB-03: sempre o setor da classificação, mesmo se o usuário trocou.
      automaticSectorId: classification.automaticSector?.id,
      confirmedSectorId: state.selected!.id,
      photos: report.photos,
    );

    emit(
      state.copyWith(
        isSubmitting: true,
        progress: () => request.hasPhotos ? 0 : null,
        submitError: () => null,
      ),
    );
    try {
      final created = await _tickets.createTicket(
        request,
        onProgress: request.hasPhotos
            ? (value) {
                if (!isClosed && state.isSubmitting) {
                  emit(state.copyWith(progress: () => value));
                }
              }
            : null,
      );
      if (!isClosed) {
        emit(
          state.copyWith(
            isSubmitting: false,
            progress: () => null,
            created: () => created,
          ),
        );
      }
      return created;
    } on AppFailure catch (failure) {
      if (!isClosed) {
        emit(
          state.copyWith(
            isSubmitting: false,
            progress: () => null,
            submitError: () =>
                _messageFor(failure, hasPhotos: request.hasPhotos),
          ),
        );
      }
      return null;
    }
  }

  static String _messageFor(AppFailure failure, {required bool hasPhotos}) {
    if (failure.statusCode == 413) return AppStrings.confirmPhotosTooLarge;
    return switch (failure) {
      // Upload interrompido: com fotos, sugerir removê-las.
      NetworkFailure() when hasPhotos => AppStrings.confirmUploadFailed,
      // 400 (validação) e 404 (setor/local não existe mais) trazem a
      // mensagem da API.
      _ => failure.message,
    };
  }
}
