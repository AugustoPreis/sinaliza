import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/src/core/styles/app_theme.dart';

extension PumpApp on WidgetTester {
  /// Monta [child] dentro de um MaterialApp com o tema do app.
  Future<void> pumpApp(Widget child) {
    return pumpWidget(
      MaterialApp(
        theme: appTheme,
        home: Scaffold(body: child),
      ),
    );
  }
}
