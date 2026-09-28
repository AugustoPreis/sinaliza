import 'package:flutter/material.dart';
import 'package:mobile/src/core/styles/app_spacing.dart';

enum AppButtonVariant { primary, secondary, text }

/// Botão padrão. Com `isLoading`, mostra um indicador e ignora toques,
/// evitando envio duplo.
class AppButton extends StatelessWidget {
  const AppButton({
    required this.label,
    required this.onPressed,
    this.variant = AppButtonVariant.primary,
    this.isLoading = false,
    this.icon,
    this.expanded = true,
    super.key,
  });

  const AppButton.secondary({
    required this.label,
    required this.onPressed,
    this.isLoading = false,
    this.icon,
    this.expanded = true,
    super.key,
  }) : variant = AppButtonVariant.secondary;

  const AppButton.text({
    required this.label,
    required this.onPressed,
    this.isLoading = false,
    this.icon,
    this.expanded = false,
    super.key,
  }) : variant = AppButtonVariant.text;

  final String label;
  final VoidCallback? onPressed;
  final AppButtonVariant variant;
  final bool isLoading;
  final IconData? icon;

  /// Ocupa toda a largura disponível.
  final bool expanded;

  @override
  Widget build(BuildContext context) {
    final VoidCallback? handler = isLoading ? null : onPressed;
    final Widget child = isLoading
        ? _Spinner(color: _foreground(context))
        : _Content(label: label, icon: icon);

    final Widget button = switch (variant) {
      AppButtonVariant.primary => FilledButton(
        onPressed: handler,
        child: child,
      ),
      AppButtonVariant.secondary => OutlinedButton(
        onPressed: handler,
        child: child,
      ),
      AppButtonVariant.text => TextButton(onPressed: handler, child: child),
    };

    final Widget semantic = Semantics(
      button: true,
      enabled: handler != null,
      label: isLoading ? label : null,
      excludeSemantics: isLoading,
      child: button,
    );

    return expanded
        ? SizedBox(width: double.infinity, child: semantic)
        : semantic;
  }

  Color _foreground(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return switch (variant) {
      AppButtonVariant.primary => scheme.onSurfaceVariant,
      AppButtonVariant.secondary || AppButtonVariant.text => scheme.primary,
    };
  }
}

class _Content extends StatelessWidget {
  const _Content({required this.label, this.icon});

  final String label;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    if (icon == null) return Text(label);
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 20),
        const SizedBox(width: AppSpacing.sm),
        Flexible(child: Text(label)),
      ],
    );
  }
}

class _Spinner extends StatelessWidget {
  const _Spinner({required this.color});

  final Color color;

  @override
  Widget build(BuildContext context) {
    return SizedBox.square(
      dimension: 20,
      child: CircularProgressIndicator(strokeWidth: 2.5, color: color),
    );
  }
}
