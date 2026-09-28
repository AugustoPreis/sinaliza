import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:mobile/src/core/styles/app_colors.dart';
import 'package:mobile/src/core/styles/app_semantic_colors.dart';
import 'package:mobile/src/core/styles/app_spacing.dart';
import 'package:mobile/src/core/styles/app_typography.dart';

final ColorScheme _colorScheme =
    ColorScheme.fromSeed(
      seedColor: AppColors.primary,
      surface: AppColors.surface,
    ).copyWith(
      primary: AppColors.primary,
      onPrimary: AppColors.onPrimary,
      primaryContainer: AppColors.primaryLight,
      onPrimaryContainer: AppColors.primaryDark,
      secondary: AppColors.secondary,
      onSecondary: AppColors.onSecondary,
      tertiary: AppColors.accent,
      error: AppColors.error,
      onError: AppColors.onSemantic,
      errorContainer: AppColors.errorContainer,
      onErrorContainer: AppColors.onErrorContainer,
      surface: AppColors.surface,
      onSurface: AppColors.textPrimary,
      onSurfaceVariant: AppColors.textSecondary,
      surfaceContainerLowest: AppColors.white,
      surfaceContainerLow: AppColors.background,
      surfaceContainer: AppColors.background,
      surfaceContainerHigh: AppColors.surfaceVariant,
      surfaceContainerHighest: AppColors.surfaceVariant,
      outline: AppColors.border,
      outlineVariant: AppColors.border,
    );

OutlineInputBorder _inputBorder(Color color, [double width = 1]) {
  return OutlineInputBorder(
    borderRadius: BorderRadius.circular(AppRadius.control),
    borderSide: BorderSide(color: color, width: width),
  );
}

final RoundedRectangleBorder _controlShape = RoundedRectangleBorder(
  borderRadius: BorderRadius.circular(AppRadius.control),
);

const Size _buttonMinSize = Size(64, 48);

/// Tema claro (único tema do MVP).
final ThemeData appTheme = ThemeData(
  useMaterial3: true,
  colorScheme: _colorScheme,
  fontFamily: AppTypography.body,
  textTheme: AppTypography.textTheme.apply(
    bodyColor: AppColors.textPrimary,
    displayColor: AppColors.textPrimary,
  ),
  scaffoldBackgroundColor: AppColors.background,
  extensions: const [AppSemanticColors.light],
  appBarTheme: const AppBarTheme(
    backgroundColor: AppColors.background,
    foregroundColor: AppColors.textPrimary,
    surfaceTintColor: AppColors.transparent,
    elevation: 0,
    scrolledUnderElevation: 1,
    centerTitle: false,
    titleTextStyle: TextStyle(
      fontFamily: AppTypography.heading,
      fontSize: 20,
      fontWeight: FontWeight.w700,
      color: AppColors.textPrimary,
    ),
    systemOverlayStyle: SystemUiOverlayStyle.dark,
  ),
  cardTheme: CardThemeData(
    color: AppColors.surface,
    surfaceTintColor: AppColors.transparent,
    elevation: 0,
    margin: EdgeInsets.zero,
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(AppRadius.card),
      side: const BorderSide(color: AppColors.border),
    ),
  ),
  dividerTheme: const DividerThemeData(color: AppColors.border, space: 1),
  iconTheme: const IconThemeData(color: AppColors.textPrimary, size: 24),
  filledButtonTheme: FilledButtonThemeData(
    style: FilledButton.styleFrom(
      minimumSize: _buttonMinSize,
      shape: _controlShape,
      textStyle: AppTypography.textTheme.labelLarge,
      disabledBackgroundColor: AppColors.border,
      disabledForegroundColor: AppColors.textSecondary,
    ),
  ),
  outlinedButtonTheme: OutlinedButtonThemeData(
    style: OutlinedButton.styleFrom(
      minimumSize: _buttonMinSize,
      shape: _controlShape,
      foregroundColor: AppColors.primary,
      side: const BorderSide(color: AppColors.primary),
      textStyle: AppTypography.textTheme.labelLarge,
    ),
  ),
  textButtonTheme: TextButtonThemeData(
    style: TextButton.styleFrom(
      foregroundColor: AppColors.primary,
      shape: _controlShape,
      textStyle: AppTypography.textTheme.labelLarge,
    ),
  ),
  inputDecorationTheme: InputDecorationTheme(
    filled: true,
    fillColor: AppColors.surface,
    contentPadding: const EdgeInsets.symmetric(
      horizontal: AppSpacing.lg,
      vertical: AppSpacing.md,
    ),
    labelStyle: const TextStyle(color: AppColors.textSecondary),
    floatingLabelStyle: const TextStyle(color: AppColors.primary),
    hintStyle: const TextStyle(color: AppColors.textSecondary),
    helperStyle: const TextStyle(color: AppColors.textSecondary),
    prefixIconColor: AppColors.textSecondary,
    suffixIconColor: AppColors.textSecondary,
    border: _inputBorder(AppColors.border),
    enabledBorder: _inputBorder(AppColors.border),
    focusedBorder: _inputBorder(AppColors.primary, 2),
    errorBorder: _inputBorder(AppColors.error),
    focusedErrorBorder: _inputBorder(AppColors.error, 2),
    disabledBorder: _inputBorder(AppColors.border.withValues(alpha: 0.6)),
    errorMaxLines: 2,
  ),
  chipTheme: const ChipThemeData(
    side: BorderSide.none,
    shape: StadiumBorder(),
    labelStyle: TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
  ),
  snackBarTheme: SnackBarThemeData(
    behavior: SnackBarBehavior.floating,
    backgroundColor: AppColors.textPrimary,
    contentTextStyle: AppTypography.textTheme.bodyMedium?.copyWith(
      color: AppColors.white,
    ),
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(AppRadius.control),
    ),
  ),
  bottomSheetTheme: const BottomSheetThemeData(
    backgroundColor: AppColors.surface,
    surfaceTintColor: AppColors.transparent,
    showDragHandle: true,
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(AppRadius.card)),
    ),
  ),
  progressIndicatorTheme: const ProgressIndicatorThemeData(
    color: AppColors.primary,
  ),
);
