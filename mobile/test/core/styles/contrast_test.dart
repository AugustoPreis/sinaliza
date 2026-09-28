import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/src/core/styles/app_colors.dart';
import 'package:mobile/src/core/styles/app_semantic_colors.dart';
import 'package:mobile/src/shared/domain/enums/ticket_status.dart';
import 'package:mobile/src/shared/presentation/widgets/ticket_status_chip.dart';

/// Razão de contraste WCAG 2.x.
double contrastRatio(Color a, Color b) {
  final la = a.computeLuminance();
  final lb = b.computeLuminance();
  return (math.max(la, lb) + 0.05) / (math.min(la, lb) + 0.05);
}

void main() {
  const aa = 4.5;

  group('contraste AA', () {
    for (final status in TicketStatus.values) {
      test('chip ${status.apiValue}', () {
        final pair = TicketStatusChip.colorsFor(
          status,
          AppSemanticColors.light,
        );
        expect(
          contrastRatio(pair.foreground, pair.background),
          greaterThanOrEqualTo(aa),
        );
      });
    }

    test('container de erro', () {
      final pair = AppSemanticColors.light.errorContainer;
      expect(
        contrastRatio(pair.foreground, pair.background),
        greaterThanOrEqualTo(aa),
      );
    });

    test('texto branco sobre cores sólidas (botão e snackbars)', () {
      for (final color in const [
        AppColors.primary,
        AppColors.success,
        AppColors.error,
        AppColors.info,
        AppColors.warning,
        AppColors.textPrimary,
      ]) {
        expect(
          contrastRatio(AppColors.white, color),
          greaterThanOrEqualTo(aa),
          reason: color.toString(),
        );
      }
    });

    test('texto sobre o fundo das telas', () {
      for (final color in const [
        AppColors.textPrimary,
        AppColors.textSecondary,
      ]) {
        expect(
          contrastRatio(color, AppColors.background),
          greaterThanOrEqualTo(aa),
        );
      }
    });
  });
}
