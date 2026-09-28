import 'package:flutter/material.dart';

/// Paleta da marca Sinaliza (mesma do portal web, `web/src/styles/global.css`).
///
/// Use estas cores só dentro do tema (`app_theme.dart`) e dos componentes base.
/// Nas telas, leia de `Theme.of(context)` / `context.colors` ou de
/// `context.appColors` (cores semânticas).
abstract final class AppColors {
  // Primárias
  static const primary = Color(0xFF0D5C63);
  static const primaryDark = Color(0xFF073F44);
  static const primaryLight = Color(0xFFDDF1F0);
  static const onPrimary = Color(0xFFFFFFFF);

  static const secondary = Color(0xFF2B5EA8);
  static const onSecondary = Color(0xFFFFFFFF);

  /// Destaque da marca: foco e ilustração. Nunca como fundo de texto branco.
  static const accent = Color(0xFFE6A83C);

  // Neutras
  static const white = Color(0xFFFFFFFF);
  static const background = Color(0xFFF5F8F7);
  static const surface = white;
  static const surfaceVariant = Color(0xFFEEF2F2);
  static const border = Color(0xFFD5DFDE);
  static const disabled = Color(0xFF98A7A8);
  static const textSecondary = Color(0xFF526466);
  static const textPrimary = Color(0xFF172526);
  static const transparent = Colors.transparent;

  // Visualizador de fotos em tela cheia (escuro por convenção)
  static const photoViewerBackground = Color(0xFF000000);
  static const onPhotoViewer = white;

  // Semânticas sólidas: ícones, bordas e fundo de snackbar (texto branco)
  static const success = Color(0xFF167A55);
  static const warning = Color(0xFFA35F00);
  static const error = Color(0xFFB9383E);
  static const info = Color(0xFF285EA8);
  static const onSemantic = white;

  // Semânticas em tom claro: chips e badges (texto escuro, contraste AA)
  static const successContainer = Color(0xFFDDF3EA);
  static const onSuccessContainer = Color(0xFF0F5A3E);
  static const warningContainer = Color(0xFFFBEFD9);
  static const onWarningContainer = Color(0xFF6E4000);
  static const errorContainer = Color(0xFFFBE4E5);
  static const onErrorContainer = Color(0xFF8A2328);
  static const infoContainer = Color(0xFFE3ECF8);
  static const onInfoContainer = Color(0xFF1C4680);
  static const neutralContainer = surfaceVariant;
  static const onNeutralContainer = Color(0xFF3A4A4C);
}
