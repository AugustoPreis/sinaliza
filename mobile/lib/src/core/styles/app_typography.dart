import 'package:flutter/material.dart';

/// Tipografia da marca: Inter no corpo, Manrope (600-700) nos títulos.
/// Fontes empacotadas em `assets/fonts` (ver `pubspec.yaml`).
abstract final class AppTypography {
  static const String body = 'Inter';
  static const String heading = 'Manrope';

  static const TextTheme textTheme = TextTheme(
    headlineLarge: TextStyle(
      fontFamily: heading,
      fontSize: 28,
      height: 1.25,
      fontWeight: FontWeight.w700,
    ),
    headlineMedium: TextStyle(
      fontFamily: heading,
      fontSize: 24,
      height: 1.3,
      fontWeight: FontWeight.w700,
    ),
    headlineSmall: TextStyle(
      fontFamily: heading,
      fontSize: 20,
      height: 1.3,
      fontWeight: FontWeight.w700,
    ),
    titleLarge: TextStyle(
      fontFamily: heading,
      fontSize: 18,
      height: 1.35,
      fontWeight: FontWeight.w600,
    ),
    titleMedium: TextStyle(
      fontSize: 16,
      height: 1.4,
      fontWeight: FontWeight.w600,
    ),
    titleSmall: TextStyle(
      fontSize: 14,
      height: 1.4,
      fontWeight: FontWeight.w600,
    ),
    bodyLarge: TextStyle(fontSize: 16, height: 1.5),
    bodyMedium: TextStyle(fontSize: 14, height: 1.45),
    bodySmall: TextStyle(fontSize: 12, height: 1.4),
    labelLarge: TextStyle(
      fontSize: 15,
      height: 1.3,
      fontWeight: FontWeight.w600,
    ),
    labelMedium: TextStyle(
      fontSize: 13,
      height: 1.3,
      fontWeight: FontWeight.w500,
    ),
    labelSmall: TextStyle(
      fontSize: 12,
      height: 1.3,
      fontWeight: FontWeight.w500,
    ),
  );
}
