import 'package:flutter/material.dart';
import 'package:mobile/src/core/styles/app_semantic_colors.dart';
import 'package:mobile/src/core/styles/app_spacing.dart';

enum AppAlertType { error, success, info, warning }

/// Aviso dentro da tela (ex.: erro de login acima do botão).
/// Anunciado pelo leitor de tela quando aparece.
class AppInlineAlert extends StatelessWidget {
  const AppInlineAlert({
    required this.message,
    this.type = AppAlertType.error,
    super.key,
  });

  final String message;
  final AppAlertType type;

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    final (ColorPair pair, IconData icon) = switch (type) {
      AppAlertType.error => (colors.errorContainer, Icons.error_outline),
      AppAlertType.success => (
        colors.successContainer,
        Icons.check_circle_outline,
      ),
      AppAlertType.info => (colors.infoContainer, Icons.info_outline),
      AppAlertType.warning => (
        colors.warningContainer,
        Icons.warning_amber_outlined,
      ),
    };

    return Semantics(
      liveRegion: true,
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: pair.background,
          borderRadius: BorderRadius.circular(AppRadius.control),
        ),
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.md),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(icon, size: 20, color: pair.foreground),
              const SizedBox(width: AppSpacing.sm),
              Expanded(
                child: Text(
                  message,
                  style: context.textStyles.bodyMedium?.copyWith(
                    color: pair.foreground,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
