import 'package:flutter/material.dart';
import 'package:mobile/src/core/errors/app_failure.dart';
import 'package:mobile/src/core/styles/app_colors.dart';
import 'package:mobile/src/core/styles/app_spacing.dart';

enum AppSnackbarType { success, error, info }

/// Snackbar padrão de feedback. Substitui a snackbar atual, se houver.
abstract final class AppSnackbar {
  static void success(BuildContext context, String message) =>
      show(context, message, type: AppSnackbarType.success);

  static void error(BuildContext context, String message) =>
      show(context, message, type: AppSnackbarType.error);

  static void info(BuildContext context, String message) =>
      show(context, message, type: AppSnackbarType.info);

  /// Erro vindo de uma chamada à API. Um 401 aqui significa sessão expirada:
  /// quem avisa é o `SessionCubit` ("Sua sessão expirou..."), então não
  /// mostramos "Não autorizado." por cima.
  static void failure(BuildContext context, AppFailure failure) {
    if (failure is UnauthorizedFailure) return;
    error(context, failure.message);
  }

  static void show(
    BuildContext context,
    String message, {
    AppSnackbarType type = AppSnackbarType.info,
  }) {
    showOn(ScaffoldMessenger.of(context), message, type: type);
  }

  /// Variante sem `BuildContext`, para uso fora da árvore de widgets
  /// (ex.: `AppNavigator.messengerKey.currentState`).
  static void showOn(
    ScaffoldMessengerState messenger,
    String message, {
    AppSnackbarType type = AppSnackbarType.info,
  }) {
    final (Color background, IconData icon) = switch (type) {
      AppSnackbarType.success => (AppColors.success, Icons.check_circle),
      AppSnackbarType.error => (AppColors.error, Icons.error),
      AppSnackbarType.info => (AppColors.textPrimary, Icons.info),
    };

    messenger
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          backgroundColor: background,
          duration: type == AppSnackbarType.error
              ? const Duration(seconds: 6)
              : const Duration(seconds: 4),
          content: Row(
            children: [
              Icon(icon, color: AppColors.onSemantic, size: 20),
              const SizedBox(width: AppSpacing.md),
              Expanded(child: Text(message)),
            ],
          ),
        ),
      );
  }
}
