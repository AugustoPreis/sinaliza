import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:mobile/src/core/l10n/app_strings.dart';
import 'package:mobile/src/core/styles/app_spacing.dart';
import 'package:mobile/src/core/widgets/app_snackbar.dart';

/// Protocolo do chamado com `#` (ex.: `#SIN-1042`), com opção de copiar.
class ProtocolText extends StatelessWidget {
  const ProtocolText(
    this.protocol, {
    this.copyable = true,
    this.style,
    super.key,
  });

  /// Valor da API, ex.: `SIN-1042`.
  final String protocol;
  final bool copyable;
  final TextStyle? style;

  /// `SIN-1042` -> `#SIN-1042` (sem duplicar o `#`).
  static String format(String protocol) {
    final value = protocol.trim();
    return value.startsWith('#') ? value : '#$value';
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final formatted = format(protocol);
    final text = Text(
      formatted,
      style: (style ?? theme.textTheme.titleMedium)?.copyWith(
        fontFeatures: const [FontFeature.tabularFigures()],
      ),
    );

    if (!copyable) return text;

    // `container`: nó próprio para o leitor de tela; sem ele o botão se funde
    // com os vizinhos (ex.: o chip de status no cabeçalho do detalhe).
    return Semantics(
      container: true,
      child: InkWell(
        borderRadius: BorderRadius.circular(AppRadius.control),
        onTap: () => _copy(context, formatted),
        child: Semantics(
          button: true,
          label: AppStrings.copyProtocol(formatted),
          excludeSemantics: true,
          // Alvo de toque mínimo de 48 dp (acessibilidade).
          child: ConstrainedBox(
            constraints: const BoxConstraints(minHeight: 48, minWidth: 48),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.xs),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Com fonte grande, quebra a linha em vez de estourar.
                  Flexible(child: text),
                  const SizedBox(width: AppSpacing.xs),
                  Icon(
                    Icons.copy_rounded,
                    size: 16,
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _copy(BuildContext context, String value) async {
    await Clipboard.setData(ClipboardData(text: value));
    if (!context.mounted) return;
    AppSnackbar.success(context, AppStrings.protocolCopied);
  }
}
