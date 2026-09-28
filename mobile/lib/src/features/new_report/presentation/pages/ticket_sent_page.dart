import 'package:flutter/material.dart';
import 'package:mobile/src/core/l10n/app_strings.dart';
import 'package:mobile/src/core/router/app_router_enum.dart';
import 'package:mobile/src/core/styles/app_semantic_colors.dart';
import 'package:mobile/src/core/styles/app_spacing.dart';
import 'package:mobile/src/core/widgets/app_button.dart';
import 'package:mobile/src/core/widgets/protocol_text.dart';
import 'package:mobile/src/shared/domain/entities/ticket.dart';

/// A.5 Chamado enviado: confirmação com protocolo e setor de destino.
///
/// Mostra só os dados da resposta de `POST /tickets` (sem nova chamada). A
/// A.4 já tirou o fluxo da pilha (e com ele o `NewReportCubit`), então esta
/// tela fica logo acima da home: voltar sempre leva a "Meus chamados".
class TicketSentPage extends StatelessWidget {
  const TicketSentPage({required this.ticket, super.key});

  final TicketCreated ticket;

  void _viewTicket(BuildContext context) {
    // Substitui a confirmação: voltar do detalhe leva à home.
    Navigator.of(context).pushReplacementNamed(
      AppRouterEnum.ticketDetail.route,
      arguments: ticket.id,
    );
  }

  void _backToList(BuildContext context) => Navigator.of(context).pop();

  @override
  Widget build(BuildContext context) {
    final secondary = context.textStyles.bodyMedium?.copyWith(
      color: context.colors.onSurfaceVariant,
    );

    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(AppSpacing.xl),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: AppSpacing.xxl),
              Semantics(
                excludeSemantics: true,
                child: Icon(
                  Icons.check_circle,
                  size: 72,
                  color: context.appColors.success,
                ),
              ),
              const SizedBox(height: AppSpacing.lg),
              Semantics(
                header: true,
                child: Text(
                  AppStrings.ticketSentHeadline,
                  textAlign: TextAlign.center,
                  style: context.textStyles.headlineMedium,
                ),
              ),
              const SizedBox(height: AppSpacing.sm),
              Text(
                AppStrings.ticketSentMessage,
                textAlign: TextAlign.center,
                style: secondary,
              ),
              const SizedBox(height: AppSpacing.xl),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(AppSpacing.lg),
                  child: Column(
                    children: [
                      Text(
                        AppStrings.ticketSentProtocolLabel,
                        style: context.textStyles.labelMedium?.copyWith(
                          color: context.colors.onSurfaceVariant,
                        ),
                      ),
                      const SizedBox(height: AppSpacing.xs),
                      ProtocolText(
                        ticket.protocol,
                        style: context.textStyles.headlineMedium?.copyWith(
                          color: context.colors.primary,
                        ),
                      ),
                      const SizedBox(height: AppSpacing.xs),
                      Text(
                        AppStrings.ticketSentProtocolHint,
                        textAlign: TextAlign.center,
                        style: context.textStyles.bodySmall?.copyWith(
                          color: context.colors.onSurfaceVariant,
                        ),
                      ),
                      const Padding(
                        padding: EdgeInsets.symmetric(vertical: AppSpacing.lg),
                        child: Divider(),
                      ),
                      Text(
                        AppStrings.ticketSentDestinationLabel,
                        style: context.textStyles.labelMedium?.copyWith(
                          color: context.colors.onSurfaceVariant,
                        ),
                      ),
                      const SizedBox(height: AppSpacing.xs),
                      // Setor para onde o chamado foi de fato encaminhado.
                      Text(
                        ticket.currentSector.name,
                        textAlign: TextAlign.center,
                        style: context.textStyles.titleLarge,
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: AppSpacing.xl),
              AppButton(
                label: AppStrings.ticketSentViewTicket,
                icon: Icons.visibility_outlined,
                onPressed: () => _viewTicket(context),
              ),
              const SizedBox(height: AppSpacing.sm),
              AppButton.secondary(
                label: AppStrings.ticketSentBackToList,
                onPressed: () => _backToList(context),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
