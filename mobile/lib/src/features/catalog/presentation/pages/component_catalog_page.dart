import 'package:flutter/material.dart';
import 'package:mobile/src/core/l10n/app_strings.dart';
import 'package:mobile/src/core/styles/app_semantic_colors.dart';
import 'package:mobile/src/core/styles/app_spacing.dart';
import 'package:mobile/src/core/utils/formatters/date_formatter.dart';
import 'package:mobile/src/core/widgets/app_button.dart';
import 'package:mobile/src/core/widgets/app_select_field.dart';
import 'package:mobile/src/core/widgets/app_snackbar.dart';
import 'package:mobile/src/core/widgets/app_text_field.dart';
import 'package:mobile/src/core/widgets/empty_view.dart';
import 'package:mobile/src/core/widgets/error_view.dart';
import 'package:mobile/src/core/widgets/loading_view.dart';
import 'package:mobile/src/core/widgets/protocol_text.dart';
import 'package:mobile/src/shared/domain/enums/institutional_link.dart';
import 'package:mobile/src/shared/domain/enums/ticket_status.dart';
import 'package:mobile/src/shared/presentation/widgets/ticket_status_chip.dart';

// Catálogo só para desenvolvimento: os textos de exemplo abaixo não vão para
// produção (a rota só existe em debug), por isso ficam fora de AppStrings.

/// Mostra todos os componentes base e seus estados. Rota `/catalog`, só em debug.
class ComponentCatalogPage extends StatefulWidget {
  const ComponentCatalogPage({super.key});

  @override
  State<ComponentCatalogPage> createState() => _ComponentCatalogPageState();
}

class _ComponentCatalogPageState extends State<ComponentCatalogPage> {
  static const _buildings = [
    AppSelectOption(value: 1, label: 'Bloco A', subtitle: 'Salas 101 a 120'),
    AppSelectOption(value: 2, label: 'Biblioteca Central'),
    AppSelectOption(value: 3, label: 'Prédio da Reitoria'),
    AppSelectOption(value: 4, label: 'Laboratório de Química'),
  ];

  bool _loading = false;
  int? _building;

  Future<void> _simulateSubmit() async {
    setState(() => _loading = true);
    await Future<void>.delayed(const Duration(seconds: 2));
    if (!mounted) return;
    setState(() => _loading = false);
    AppSnackbar.success(context, 'Enviado com sucesso.');
  }

  @override
  Widget build(BuildContext context) {
    final now = DateTime.now();

    return Scaffold(
      appBar: AppBar(title: const Text(AppStrings.catalogTitle)),
      body: ListView(
        padding: AppSpacing.screen,
        children: [
          const _Section('Tipografia'),
          Text('Headline medium', style: context.textStyles.headlineMedium),
          Text('Title large', style: context.textStyles.titleLarge),
          Text('Title medium', style: context.textStyles.titleMedium),
          Text(
            'Body large com acentuação: ção, ã, é',
            style: context.textStyles.bodyLarge,
          ),
          Text('Body small secundário', style: context.textStyles.bodySmall),

          const _Section('Status do chamado'),
          Wrap(
            spacing: AppSpacing.sm,
            runSpacing: AppSpacing.sm,
            children: [
              for (final status in TicketStatus.values)
                TicketStatusChip(status),
            ],
          ),

          const _Section('Botões'),
          AppButton(
            label: 'Enviar chamado',
            isLoading: _loading,
            onPressed: _simulateSubmit,
          ),
          const SizedBox(height: AppSpacing.sm),
          const AppButton(
            label: 'Carregando',
            isLoading: true,
            onPressed: null,
          ),
          const SizedBox(height: AppSpacing.sm),
          const AppButton(label: 'Desabilitado', onPressed: null),
          const SizedBox(height: AppSpacing.sm),
          AppButton.secondary(
            label: 'Secundário com ícone',
            icon: Icons.add_a_photo_outlined,
            onPressed: () {},
          ),
          const SizedBox(height: AppSpacing.sm),
          AppButton.text(label: 'Esqueci minha senha', onPressed: () {}),

          const _Section('Campos'),
          const AppTextField(
            label: 'Matrícula ou e-mail',
            hint: 'ex.: 2023001234',
          ),
          const SizedBox(height: AppSpacing.md),
          const AppTextField(label: 'Senha', isPassword: true),
          const SizedBox(height: AppSpacing.md),
          const AppTextField(
            label: 'Descreva o problema',
            maxLength: 500,
            minLines: 3,
            maxLines: 6,
          ),
          const SizedBox(height: AppSpacing.md),
          const AppTextField(
            label: 'Com erro',
            errorText: 'Informe sua matrícula ou e-mail.',
          ),
          const SizedBox(height: AppSpacing.md),
          const AppTextField(label: 'Desabilitado', enabled: false),

          const _Section('Seletor com busca'),
          AppSelectField<int>(
            label: 'Prédio',
            options: _buildings,
            value: _building,
            prefixIcon: Icons.apartment_outlined,
            onChanged: (value) => setState(() => _building = value),
          ),
          const SizedBox(height: AppSpacing.md),
          AppSelectField<int>(
            label: 'Ambiente',
            options: const [],
            enabled: _building != null,
            helperText: _building == null ? 'Escolha o prédio primeiro.' : null,
            onChanged: (_) {},
          ),

          const _Section('Protocolo'),
          const ProtocolText('SIN-1042'),
          const ProtocolText('SIN-1043', copyable: false),

          const _Section('Snackbars'),
          Wrap(
            spacing: AppSpacing.sm,
            children: [
              AppButton.text(
                label: 'Sucesso',
                onPressed: () =>
                    AppSnackbar.success(context, 'Chamado enviado.'),
              ),
              AppButton.text(
                label: 'Erro',
                onPressed: () =>
                    AppSnackbar.error(context, 'Não foi possível enviar.'),
              ),
              AppButton.text(
                label: 'Info',
                onPressed: () => AppSnackbar.info(context, 'Sem conexão.'),
              ),
            ],
          ),

          const _Section('Datas e vínculo'),
          Text(AppDateFormatter.dateTime(now)),
          for (final ago in const [
            Duration(seconds: 20),
            Duration(minutes: 5),
            Duration(hours: 2),
            Duration(days: 1),
            Duration(days: 3),
            Duration(days: 12),
          ])
            Text(AppDateFormatter.relativeShort(now.subtract(ago), now: now)),
          Text(InstitutionalLink.values.map((link) => link.label).join(' · ')),

          const _Section('Estados de tela'),
          const _Frame(child: LoadingView(message: AppStrings.loading)),
          _Frame(child: ErrorView(onRetry: () {})),
          const _Frame(
            child: EmptyView(message: 'Você ainda não abriu nenhum chamado.'),
          ),
          const SizedBox(height: AppSpacing.xxl),
        ],
      ),
    );
  }
}

class _Section extends StatelessWidget {
  const _Section(this.title);

  final String title;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: AppSpacing.xl, bottom: AppSpacing.md),
      child: Text(title, style: context.textStyles.titleLarge),
    );
  }
}

class _Frame extends StatelessWidget {
  const _Frame({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.md),
      child: Card(child: SizedBox(height: 220, child: child)),
    );
  }
}
