import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:mobile/src/core/l10n/app_strings.dart';
import 'package:mobile/src/core/router/app_router_enum.dart';
import 'package:mobile/src/core/styles/app_semantic_colors.dart';
import 'package:mobile/src/core/styles/app_spacing.dart';
import 'package:mobile/src/core/widgets/app_button.dart';
import 'package:mobile/src/core/widgets/app_inline_alert.dart';
import 'package:mobile/src/core/widgets/app_select_field.dart';
import 'package:mobile/src/features/new_report/presentation/cubit/confirm_sector_cubit.dart';
import 'package:mobile/src/features/new_report/presentation/cubit/new_report_cubit.dart';
import 'package:mobile/src/features/reference_data/domain/repositories/reference_data_repositories.dart';
import 'package:mobile/src/features/tickets/domain/repositories/tickets_repository.dart';
import 'package:mobile/src/shared/domain/entities/refs.dart';
import 'package:mobile/src/shared/domain/entities/ticket.dart';

/// A.4 Confirmação do setor: mostra a sugestão automática e deixa o
/// solicitante confirmar ou trocar antes de enviar. As duas escolhas
/// (automática e final) vão para a API.
///
/// Recebe o [NewReportCubit] do fluxo (argumento da rota).
class ConfirmSectorPage extends StatelessWidget {
  const ConfirmSectorPage({super.key});

  @override
  Widget build(BuildContext context) {
    final flow = context.read<NewReportCubit>();
    return BlocProvider(
      create: (context) => ConfirmSectorCubit(
        report: () => flow.state,
        sectors: context.read<SectorsRepository>(),
        tickets: context.read<TicketsRepository>(),
      )..loadSectors(),
      child: const _ConfirmSectorView(),
    );
  }
}

class _ConfirmSectorView extends StatelessWidget {
  const _ConfirmSectorView();

  /// Rotas do fluxo que saem da pilha quando o chamado é criado: voltar da
  /// A.5 leva para a home, sem reenviar.
  static final _flowRoutes = {
    AppRouterEnum.newReport.route,
    AppRouterEnum.confirmSector.route,
  };

  Future<void> _submit(BuildContext context) async {
    final created = await context.read<ConfirmSectorCubit>().submit();
    if (created == null || !context.mounted) return;
    await _openSent(context, created);
  }

  Future<void> _openSent(BuildContext context, TicketCreated created) async {
    await Navigator.of(context).pushNamedAndRemoveUntil(
      AppRouterEnum.ticketSent.route,
      (route) => !_flowRoutes.contains(route.settings.name),
      arguments: created,
    );
  }

  @override
  Widget build(BuildContext context) {
    final report = context.watch<NewReportCubit>().state;

    return BlocBuilder<ConfirmSectorCubit, ConfirmSectorState>(
      builder: (context, state) {
        final cubit = context.read<ConfirmSectorCubit>();
        final submitting = state.isSubmitting;

        return PopScope(
          // Voltar durante o envio poderia duplicar o chamado.
          canPop: !submitting,
          child: Scaffold(
            appBar: AppBar(
              title: const Text(AppStrings.confirmSectorTitle),
              automaticallyImplyLeading: !submitting,
            ),
            body: SafeArea(
              child: ListView(
                padding: const EdgeInsets.all(AppSpacing.lg),
                children: [
                  if (state.suggestion != null)
                    _SuggestionCard(sector: state.suggestion!)
                  else
                    const AppInlineAlert(
                      message: AppStrings.confirmNoSuggestion,
                      type: AppAlertType.info,
                    ),
                  const SizedBox(height: AppSpacing.xl),
                  AppSelectField<SectorRef>(
                    label: AppStrings.confirmSendTo,
                    prefixIcon: Icons.send_outlined,
                    enabled:
                        !submitting &&
                        state.sectorsStatus == SectorsStatus.ready,
                    helperText: state.sectorsStatus == SectorsStatus.loading
                        ? AppStrings.loading
                        : null,
                    value: state.selected,
                    options: [
                      for (final sector in state.sectors)
                        AppSelectOption(value: sector, label: sector.name),
                    ],
                    onChanged: cubit.select,
                  ),
                  if (state.sectorsStatus == SectorsStatus.failure) ...[
                    const SizedBox(height: AppSpacing.sm),
                    const AppInlineAlert(
                      message: AppStrings.confirmSectorsUnavailable,
                      type: AppAlertType.warning,
                    ),
                    Align(
                      alignment: Alignment.centerRight,
                      child: AppButton.text(
                        label: AppStrings.retry,
                        icon: Icons.refresh,
                        onPressed: submitting
                            ? null
                            : () => cubit.loadSectors(forceRefresh: true),
                      ),
                    ),
                  ],
                  if (state.changedSuggestion) ...[
                    const SizedBox(height: AppSpacing.sm),
                    const AppInlineAlert(
                      message: AppStrings.confirmSectorChanged,
                      type: AppAlertType.info,
                    ),
                  ],
                  const SizedBox(height: AppSpacing.xl),
                  _ReportSummary(report: report, enabled: !submitting),
                  const SizedBox(height: AppSpacing.xl),
                  if (state.submitError != null) ...[
                    AppInlineAlert(message: state.submitError!),
                    const SizedBox(height: AppSpacing.md),
                  ],
                  AppButton(
                    label: state.submitError != null
                        ? AppStrings.retry
                        : AppStrings.confirmSubmit,
                    icon: Icons.send,
                    isLoading: submitting,
                    onPressed: state.canSubmit ? () => _submit(context) : null,
                  ),
                  if (submitting && state.progress != null) ...[
                    const SizedBox(height: AppSpacing.md),
                    LinearProgressIndicator(value: state.progress),
                    const SizedBox(height: AppSpacing.xs),
                    Text(
                      AppStrings.confirmUploading(
                        (state.progress! * 100).round(),
                      ),
                      textAlign: TextAlign.center,
                      style: context.textStyles.bodySmall?.copyWith(
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

class _SuggestionCard extends StatelessWidget {
  const _SuggestionCard({required this.sector});

  final SectorRef sector;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      container: true,
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: context.colors.primaryContainer,
          borderRadius: BorderRadius.circular(AppRadius.card),
        ),
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.lg),
          child: Row(
            children: [
              Icon(
                Icons.auto_awesome_outlined,
                color: context.colors.onPrimaryContainer,
              ),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      AppStrings.confirmSuggestionIntro,
                      style: context.textStyles.bodyMedium?.copyWith(
                        color: context.colors.onPrimaryContainer,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.xs),
                    Text(
                      sector.name,
                      style: context.textStyles.headlineSmall?.copyWith(
                        color: context.colors.onPrimaryContainer,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Resumo do relato, com "Editar" (volta para a A.3 com tudo preenchido).
class _ReportSummary extends StatelessWidget {
  const _ReportSummary({required this.report, required this.enabled});

  final NewReportState report;
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    final secondary = context.textStyles.bodySmall?.copyWith(
      color: context.colors.onSurfaceVariant,
    );

    return Card(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(
          AppSpacing.lg,
          AppSpacing.sm,
          AppSpacing.sm,
          AppSpacing.lg,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    AppStrings.confirmSummaryTitle,
                    style: context.textStyles.titleMedium,
                  ),
                ),
                AppButton.text(
                  label: AppStrings.confirmEdit,
                  icon: Icons.edit_outlined,
                  onPressed: enabled ? () => Navigator.of(context).pop() : null,
                ),
              ],
            ),
            Padding(
              padding: const EdgeInsets.only(right: AppSpacing.sm),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    report.trimmedDescription,
                    maxLines: 3,
                    overflow: TextOverflow.ellipsis,
                    style: context.textStyles.bodyMedium,
                  ),
                  const SizedBox(height: AppSpacing.md),
                  _SummaryLine(
                    icon: Icons.place_outlined,
                    text:
                        '${report.building?.name ?? ''} · '
                        '${report.environment?.name ?? ''}',
                    style: secondary,
                  ),
                  const SizedBox(height: AppSpacing.xs),
                  _SummaryLine(
                    icon: Icons.photo_outlined,
                    text: AppStrings.confirmPhotos(report.photos.length),
                    style: secondary,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SummaryLine extends StatelessWidget {
  const _SummaryLine({required this.icon, required this.text, this.style});

  final IconData icon;
  final String text;
  final TextStyle? style;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 16, color: context.colors.onSurfaceVariant),
        const SizedBox(width: AppSpacing.xs),
        Expanded(child: Text(text, style: style)),
      ],
    );
  }
}
