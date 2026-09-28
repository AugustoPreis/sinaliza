import 'package:flutter/widgets.dart';

enum HomeTab { tickets, notifications, profile }

/// Publica a aba ativa da home para as telas das abas (que ficam montadas
/// no `IndexedStack` mesmo quando não aparecem).
class HomeTabScope extends InheritedWidget {
  const HomeTabScope({required this.current, required super.child, super.key});

  final HomeTab current;

  /// Aba ativa, ou `null` fora da home (ex.: tela aberta sozinha em teste).
  static HomeTab? of(BuildContext context) =>
      context.dependOnInheritedWidgetOfExactType<HomeTabScope>()?.current;

  @override
  bool updateShouldNotify(HomeTabScope oldWidget) =>
      current != oldWidget.current;
}
