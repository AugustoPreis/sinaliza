import 'package:flutter/widgets.dart';
import 'package:mobile/src/core/l10n/app_strings.dart';
import 'package:mobile/src/core/styles/app_colors.dart';

/// Símbolo "Rota Clara" da marca: três entradas convergindo num destino
/// (mesmo desenho de `web/src/shared/assets/brand/logo.tsx`, viewBox 100).
class SinalizaLogo extends StatelessWidget {
  const SinalizaLogo({
    this.size = 56,
    this.color = AppColors.primary,
    super.key,
  });

  final double size;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: AppStrings.appName,
      image: true,
      child: CustomPaint(
        size: Size.square(size),
        painter: SinalizaLogoPainter(color: color),
      ),
    );
  }
}

/// Desenha o símbolo ocupando o quadrado do canvas. Também usado pelo
/// `tool/generate_brand_assets_test.dart` para gerar ícone e splash.
class SinalizaLogoPainter extends CustomPainter {
  const SinalizaLogoPainter({required this.color});

  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final scale = size.shortestSide / 100;
    canvas
      ..save()
      ..translate(
        (size.width - 100 * scale) / 2,
        (size.height - 100 * scale) / 2,
      )
      ..scale(scale);

    final stroke = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 7
      ..strokeCap = StrokeCap.round;
    final fill = Paint()..color = color;

    final paths = Path()
      ..moveTo(18, 25)
      ..cubicTo(36, 25, 38, 50, 57, 50)
      ..moveTo(18, 75)
      ..cubicTo(36, 75, 38, 50, 57, 50)
      ..moveTo(18, 50)
      ..lineTo(82, 50);
    canvas
      ..drawPath(paths, stroke)
      ..drawCircle(const Offset(18, 25), 4, fill)
      ..drawCircle(const Offset(18, 50), 4, fill)
      ..drawCircle(const Offset(18, 75), 4, fill)
      ..drawCircle(const Offset(82, 50), 7, fill)
      ..restore();
  }

  @override
  bool shouldRepaint(SinalizaLogoPainter oldDelegate) =>
      oldDelegate.color != color;
}
