import 'package:flutter/material.dart';
import 'package:mobile/src/core/styles/app_colors.dart';

/// Par fundo/texto usado em chips, badges e avisos.
@immutable
class ColorPair {
  const ColorPair(this.background, this.foreground);

  final Color background;
  final Color foreground;

  static ColorPair lerp(ColorPair a, ColorPair b, double t) => ColorPair(
    Color.lerp(a.background, b.background, t)!,
    Color.lerp(a.foreground, b.foreground, t)!,
  );
}

/// Cores semânticas que o `ColorScheme` do Material não cobre.
@immutable
class AppSemanticColors extends ThemeExtension<AppSemanticColors> {
  const AppSemanticColors({
    required this.success,
    required this.warning,
    required this.info,
    required this.successContainer,
    required this.warningContainer,
    required this.infoContainer,
    required this.errorContainer,
    required this.neutralContainer,
    required this.textSecondary,
  });

  final Color success;
  final Color warning;
  final Color info;
  final ColorPair successContainer;
  final ColorPair warningContainer;
  final ColorPair infoContainer;
  final ColorPair errorContainer;
  final ColorPair neutralContainer;
  final Color textSecondary;

  static const light = AppSemanticColors(
    success: AppColors.success,
    warning: AppColors.warning,
    info: AppColors.info,
    successContainer: ColorPair(
      AppColors.successContainer,
      AppColors.onSuccessContainer,
    ),
    warningContainer: ColorPair(
      AppColors.warningContainer,
      AppColors.onWarningContainer,
    ),
    infoContainer: ColorPair(
      AppColors.infoContainer,
      AppColors.onInfoContainer,
    ),
    errorContainer: ColorPair(
      AppColors.errorContainer,
      AppColors.onErrorContainer,
    ),
    neutralContainer: ColorPair(
      AppColors.neutralContainer,
      AppColors.onNeutralContainer,
    ),
    textSecondary: AppColors.textSecondary,
  );

  @override
  AppSemanticColors copyWith({
    Color? success,
    Color? warning,
    Color? info,
    ColorPair? successContainer,
    ColorPair? warningContainer,
    ColorPair? infoContainer,
    ColorPair? errorContainer,
    ColorPair? neutralContainer,
    Color? textSecondary,
  }) {
    return AppSemanticColors(
      success: success ?? this.success,
      warning: warning ?? this.warning,
      info: info ?? this.info,
      successContainer: successContainer ?? this.successContainer,
      warningContainer: warningContainer ?? this.warningContainer,
      infoContainer: infoContainer ?? this.infoContainer,
      errorContainer: errorContainer ?? this.errorContainer,
      neutralContainer: neutralContainer ?? this.neutralContainer,
      textSecondary: textSecondary ?? this.textSecondary,
    );
  }

  @override
  AppSemanticColors lerp(AppSemanticColors? other, double t) {
    if (other == null) return this;
    return AppSemanticColors(
      success: Color.lerp(success, other.success, t)!,
      warning: Color.lerp(warning, other.warning, t)!,
      info: Color.lerp(info, other.info, t)!,
      successContainer: ColorPair.lerp(
        successContainer,
        other.successContainer,
        t,
      ),
      warningContainer: ColorPair.lerp(
        warningContainer,
        other.warningContainer,
        t,
      ),
      infoContainer: ColorPair.lerp(infoContainer, other.infoContainer, t),
      errorContainer: ColorPair.lerp(errorContainer, other.errorContainer, t),
      neutralContainer: ColorPair.lerp(
        neutralContainer,
        other.neutralContainer,
        t,
      ),
      textSecondary: Color.lerp(textSecondary, other.textSecondary, t)!,
    );
  }
}

/// Atalhos para ler o tema nas telas sem definir cores soltas.
extension AppThemeContext on BuildContext {
  ColorScheme get colors => Theme.of(this).colorScheme;
  TextTheme get textStyles => Theme.of(this).textTheme;
  AppSemanticColors get appColors =>
      Theme.of(this).extension<AppSemanticColors>() ?? AppSemanticColors.light;
}
