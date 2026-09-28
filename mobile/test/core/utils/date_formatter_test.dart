import 'package:flutter_test/flutter_test.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:mobile/src/core/utils/formatters/date_formatter.dart';
import 'package:mobile/src/core/utils/formatters/text_normalizer.dart';

void main() {
  setUpAll(() => initializeDateFormatting('pt_BR'));

  group('AppDateFormatter', () {
    test('parseApi converte UTC para o fuso local', () {
      final parsed = AppDateFormatter.parseApi('2026-03-05T17:30:00.000Z');
      expect(parsed.isUtc, isFalse);
      expect(parsed, DateTime.utc(2026, 3, 5, 17, 30).toLocal());
    });

    test('dateTime usa dd/MM/yyyy HH:mm', () {
      expect(
        AppDateFormatter.dateTime(DateTime(2026, 3, 5, 9, 7)),
        '05/03/2026 09:07',
      );
    });

    group('relativeShort', () {
      final now = DateTime(2026, 3, 10, 15);
      String rel(Duration ago) =>
          AppDateFormatter.relativeShort(now.subtract(ago), now: now);

      test('agora', () => expect(rel(const Duration(seconds: 30)), 'agora'));
      test('minutos', () {
        expect(rel(const Duration(minutes: 5)), 'há 5 min');
      });
      test('horas', () => expect(rel(const Duration(hours: 2)), 'há 2 h'));
      test('ontem', () => expect(rel(const Duration(hours: 30)), 'ontem'));
      test('dias', () => expect(rel(const Duration(days: 3)), 'há 3 d'));
      test('7+ dias vira data', () {
        expect(rel(const Duration(days: 12)), '26/02/2026');
      });
    });
  });

  test('normalizeForSearch ignora acentos e maiúsculas', () {
    expect(normalizeForSearch('  Prédio da REITORIA '), 'predio da reitoria');
    expect(
      normalizeForSearch('Laboratório de Informação'),
      'laboratorio de informacao',
    );
  });
}
