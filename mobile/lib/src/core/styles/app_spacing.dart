import 'package:flutter/widgets.dart';

/// Espaçamentos padrão (grade de 4 px).
abstract final class AppSpacing {
  static const double xxs = 2;
  static const double xs = 4;
  static const double sm = 8;
  static const double md = 12;
  static const double lg = 16;
  static const double xl = 24;
  static const double xxl = 32;

  /// Margem padrão do conteúdo das telas.
  static const EdgeInsets screen = EdgeInsets.all(lg);
}

/// Raios de borda da marca.
abstract final class AppRadius {
  /// Botões e campos.
  static const double control = 10;

  /// Cards e bottom sheets.
  static const double card = 16;

  /// Chips e badges.
  static const double pill = 999;
}
