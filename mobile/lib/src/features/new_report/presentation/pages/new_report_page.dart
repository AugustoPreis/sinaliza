import 'package:app_settings/app_settings.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:mobile/src/core/l10n/app_strings.dart';
import 'package:mobile/src/core/router/app_router_enum.dart';
import 'package:mobile/src/core/styles/app_semantic_colors.dart';
import 'package:mobile/src/core/styles/app_spacing.dart';
import 'package:mobile/src/core/widgets/app_button.dart';
import 'package:mobile/src/core/widgets/app_inline_alert.dart';
import 'package:mobile/src/core/widgets/app_select_field.dart';
import 'package:mobile/src/core/widgets/app_snackbar.dart';
import 'package:mobile/src/core/widgets/app_text_field.dart';
import 'package:mobile/src/features/new_report/data/services/photo_picker.dart';
import 'package:mobile/src/features/new_report/data/services/photo_processor.dart';
import 'package:mobile/src/features/new_report/domain/repositories/classification_repository.dart';
import 'package:mobile/src/features/new_report/presentation/cubit/new_report_cubit.dart';
import 'package:mobile/src/features/new_report/presentation/widgets/report_photos_section.dart';
import 'package:mobile/src/features/reference_data/domain/repositories/reference_data_repositories.dart';
import 'package:mobile/src/shared/domain/entities/building.dart';

/// A.3 Novo relato: descrição livre, local (prédio -> ambiente) e fotos.
/// Não há categorias: a classificação acontece ao continuar, só com o texto.
///
/// Dona do [NewReportCubit] do fluxo: ele é passado à A.4 e fechado quando
/// esta tela sai da pilha (envio concluído ou relato descartado).
class NewReportPage extends StatelessWidget {
  const NewReportPage({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (context) => NewReportCubit(
        locations: context.read<LocationsRepository>(),
        classification: context.read<ClassificationRepository>(),
        photoPicker: context.read<PhotoPicker>(),
        photoProcessor: context.read<PhotoProcessor>(),
      )..loadLocations(),
      child: const _NewReportView(),
    );
  }
}

class _NewReportView extends StatefulWidget {
  const _NewReportView();

  @override
  State<_NewReportView> createState() => _NewReportViewState();
}

class _NewReportViewState extends State<_NewReportView> {
  final _description = TextEditingController();

  @override
  void dispose() {
    _description.dispose();
    super.dispose();
  }

  Future<void> _continue() async {
    FocusScope.of(context).unfocus();
    final cubit = context.read<NewReportCubit>();
    if (!await cubit.classify() || !mounted) return;
    // A.4 recebe o mesmo cubit: voltar para cá mantém tudo preenchido.
    await Navigator.of(
      context,
    ).pushNamed(AppRouterEnum.confirmSector.route, arguments: cubit);
  }

  Future<void> _confirmDiscard() async {
    final discard = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text(AppStrings.reportDiscardTitle),
        content: const Text(AppStrings.reportDiscardMessage),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text(AppStrings.reportKeepEditing),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text(AppStrings.reportDiscard),
          ),
        ],
      ),
    );
    if ((discard ?? false) && mounted) Navigator.of(context).pop();
  }

  Future<void> _showPermissionDenied(PhotoSource source) async {
    final open = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text(AppStrings.reportPermissionTitle),
        content: Text(
          source == PhotoSource.camera
              ? AppStrings.reportCameraPermissionDenied
              : AppStrings.reportGalleryPermissionDenied,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text(AppStrings.cancel),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text(AppStrings.openSettings),
          ),
        ],
      ),
    );
    if (open ?? false) await AppSettings.openAppSettings();
  }

  void _onNotice(BuildContext context, NewReportState state) {
    switch (state.notice) {
      case PhotoNotice(:final message):
        AppSnackbar.info(context, message);
      case PermissionDeniedNotice(:final source):
        _showPermissionDenied(source);
      case null:
        break;
    }
  }

  @override
  Widget build(BuildContext context) {
    return BlocConsumer<NewReportCubit, NewReportState>(
      listenWhen: (previous, current) =>
          current.notice != null && previous.notice != current.notice,
      listener: _onNotice,
      builder: (context, state) {
        final cubit = context.read<NewReportCubit>();
        final busy = state.isClassifying;

        return PopScope(
          canPop: !state.hasUnsavedData && !busy,
          onPopInvokedWithResult: (didPop, _) {
            if (!didPop && !busy) _confirmDiscard();
          },
          child: Scaffold(
            appBar: AppBar(title: const Text(AppStrings.newReportTitle)),
            body: SafeArea(
              child: ListView(
                padding: const EdgeInsets.all(AppSpacing.lg),
                children: [
                  AppTextField(
                    controller: _description,
                    label: AppStrings.reportDescriptionLabel,
                    hint: AppStrings.reportDescriptionHint,
                    helperText: AppStrings.reportDescriptionHelper,
                    enabled: !busy,
                    minLines: 5,
                    maxLines: 10,
                    maxLength: NewReportState.maxDescriptionLength,
                    keyboardType: TextInputType.multiline,
                    textCapitalization: TextCapitalization.sentences,
                    onChanged: cubit.descriptionChanged,
                  ),
                  const SizedBox(height: AppSpacing.xl),
                  Text(
                    AppStrings.reportLocationTitle,
                    style: context.textStyles.titleMedium,
                  ),
                  const SizedBox(height: AppSpacing.md),
                  _LocationFields(state: state, enabled: !busy),
                  const SizedBox(height: AppSpacing.xl),
                  ReportPhotosSection(
                    photos: state.photos,
                    isProcessing: state.isProcessingPhotos,
                    enabled: !busy,
                    onAdd: cubit.addPhotos,
                    onRemove: cubit.removePhoto,
                  ),
                  const SizedBox(height: AppSpacing.xl),
                  if (state.classifyFailure != null) ...[
                    AppInlineAlert(message: state.classifyFailure!.message),
                    const SizedBox(height: AppSpacing.md),
                  ],
                  AppButton(
                    label: state.classifyStatus == ClassifyStatus.failure
                        ? AppStrings.retry
                        : AppStrings.reportContinue,
                    isLoading: busy,
                    onPressed: state.canContinue ? _continue : null,
                  ),
                  if (busy) ...[
                    const SizedBox(height: AppSpacing.md),
                    Text(
                      AppStrings.reportClassifying,
                      textAlign: TextAlign.center,
                      style: context.textStyles.bodyMedium?.copyWith(
                        color: context.colors.onSurfaceVariant,
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}

/// Prédio -> ambiente. Trocar o prédio limpa o ambiente (no cubit).
class _LocationFields extends StatelessWidget {
  const _LocationFields({required this.state, required this.enabled});

  final NewReportState state;
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    final cubit = context.read<NewReportCubit>();

    if (state.locationsStatus == LocationsStatus.failure) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          AppInlineAlert(message: state.locationsFailure!.message),
          Align(
            alignment: Alignment.centerRight,
            child: AppButton.text(
              label: AppStrings.retry,
              icon: Icons.refresh,
              onPressed: () => cubit.loadLocations(forceRefresh: true),
            ),
          ),
        ],
      );
    }

    final loading = state.locationsStatus == LocationsStatus.loading;
    final building = state.building;
    final noEnvironments = building != null && building.environments.isEmpty;

    return Column(
      children: [
        AppSelectField<Building>(
          label: AppStrings.reportBuildingLabel,
          prefixIcon: Icons.apartment_outlined,
          enabled: enabled && !loading,
          helperText: loading ? AppStrings.reportLoadingLocations : null,
          value: building,
          options: [
            for (final b in state.buildings)
              AppSelectOption(value: b, label: b.name),
          ],
          onChanged: cubit.selectBuilding,
        ),
        const SizedBox(height: AppSpacing.md),
        AppSelectField<Environment>(
          label: AppStrings.reportEnvironmentLabel,
          prefixIcon: Icons.meeting_room_outlined,
          enabled: enabled && building != null && !noEnvironments,
          helperText: building == null
              ? AppStrings.reportChooseBuildingFirst
              : null,
          errorText: noEnvironments
              ? AppStrings.reportBuildingWithoutEnvironments
              : null,
          value: state.environment,
          sheetTitle: building == null
              ? null
              : '${AppStrings.reportEnvironmentLabel} · ${building.name}',
          options: [
            for (final e in building?.environments ?? const <Environment>[])
              AppSelectOption(value: e, label: e.name),
          ],
          onChanged: cubit.selectEnvironment,
        ),
      ],
    );
  }
}
