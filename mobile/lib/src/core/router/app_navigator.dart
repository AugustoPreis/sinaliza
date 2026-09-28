import 'package:flutter/material.dart';

/// Chaves globais de navegação e snackbar, registradas no `get_it`.
///
/// Permitem navegar/avisar fora da árvore de widgets: reação à sessão
/// expirada (task 05) e toque em push notification (task 15).
class AppNavigator {
  final GlobalKey<NavigatorState> navigatorKey = GlobalKey<NavigatorState>();
  final GlobalKey<ScaffoldMessengerState> messengerKey =
      GlobalKey<ScaffoldMessengerState>();

  NavigatorState? get navigator => navigatorKey.currentState;

  /// Troca a pilha inteira pela rota [route] (sem voltar para trás).
  Future<void> resetTo(String route, {Object? arguments}) async {
    await navigator?.pushNamedAndRemoveUntil<void>(
      route,
      (_) => false,
      arguments: arguments,
    );
  }

  Future<T?> push<T>(String route, {Object? arguments}) async {
    return navigator?.pushNamed<T>(route, arguments: arguments);
  }
}
