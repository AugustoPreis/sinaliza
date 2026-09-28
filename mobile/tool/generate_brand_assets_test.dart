// Gera os PNGs de ícone e splash a partir do símbolo da marca desenhado em
// código (SinalizaLogoPainter), sem depender de ferramentas externas.
//
// Rodar (na pasta mobile/), depois gerar os ícones/splash nativos:
//   flutter test tool/generate_brand_assets_test.dart
//   dart run flutter_launcher_icons
//   dart run flutter_native_splash:create
//
// Fica em tool/ (fora de test/) para não rodar no `flutter test` normal.

import 'dart:io';
import 'dart:ui' as ui;

import 'package:flutter/painting.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/src/core/styles/app_colors.dart';
import 'package:mobile/src/core/widgets/sinaliza_logo.dart';

Future<void> _render(
  String path, {
  required int size,
  required Color symbolColor,
  Color? background,
  double radiusFactor = 0,
  double symbolFactor = 1,
}) async {
  final recorder = ui.PictureRecorder();
  final canvas = Canvas(recorder);
  final full = Rect.fromLTWH(0, 0, size.toDouble(), size.toDouble());

  if (background != null) {
    canvas.drawRRect(
      RRect.fromRectAndRadius(full, Radius.circular(size * radiusFactor)),
      Paint()..color = background,
    );
  }

  final symbolSize = size * symbolFactor;
  final offset = (size - symbolSize) / 2;
  canvas
    ..save()
    ..translate(offset, offset);
  SinalizaLogoPainter(
    color: symbolColor,
  ).paint(canvas, Size.square(symbolSize));
  canvas.restore();

  final image = await recorder.endRecording().toImage(size, size);
  final bytes = await image.toByteData(format: ui.ImageByteFormat.png);
  final file = File(path)..createSync(recursive: true);
  await file.writeAsBytes(bytes!.buffer.asUint8List());
}

void main() {
  testWidgets('gera ícone e splash', (tester) async {
    await tester.runAsync(() async {
      // Ícone clássico (iOS e Android antigo): fundo teal, símbolo branco.
      await _render(
        'assets/brand/app_icon.png',
        size: 1024,
        background: AppColors.primary,
        symbolColor: AppColors.white,
        symbolFactor: 0.8,
      );
      // Ícone adaptativo (Android 8+): só o símbolo, dentro da zona segura
      // (66% central); o fundo teal vem do `adaptive_icon_background`.
      await _render(
        'assets/brand/app_icon_foreground.png',
        size: 1024,
        symbolColor: AppColors.white,
        symbolFactor: 0.55,
      );
      // Splash: símbolo teal sobre o fundo claro da marca.
      await _render(
        'assets/brand/splash_logo.png',
        size: 768,
        symbolColor: AppColors.primary,
        symbolFactor: 0.6,
      );
    });

    for (final name in ['app_icon', 'app_icon_foreground', 'splash_logo']) {
      expect(File('assets/brand/$name.png').existsSync(), isTrue);
    }
  });
}
