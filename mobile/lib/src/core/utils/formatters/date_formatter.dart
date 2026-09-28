import 'package:intl/intl.dart';
import 'package:mobile/src/core/l10n/app_strings.dart';

/// Formatação de datas para exibição. A API envia ISO 8601 em UTC; aqui tudo
/// é convertido para o fuso local do aparelho.
abstract final class AppDateFormatter {
  static final DateFormat _dateTime = DateFormat('dd/MM/yyyy HH:mm', 'pt_BR');
  static final DateFormat _date = DateFormat('dd/MM/yyyy', 'pt_BR');

  /// Converte o texto ISO 8601 da API para `DateTime` local.
  static DateTime parseApi(String value) => DateTime.parse(value).toLocal();

  /// `dd/MM/yyyy HH:mm`, ex.: `05/03/2026 14:30`.
  static String dateTime(DateTime value) => _dateTime.format(value.toLocal());

  /// `dd/MM/yyyy`, ex.: `05/03/2026`.
  static String date(DateTime value) => _date.format(value.toLocal());

  /// Relativo curto para listas: `agora`, `há 5 min`, `há 2 h`, `ontem`,
  /// `há 3 d` e, a partir de 7 dias, a data `dd/MM/yyyy`.
  static String relativeShort(DateTime value, {DateTime? now}) {
    final local = value.toLocal();
    final reference = (now ?? DateTime.now()).toLocal();
    final diff = reference.difference(local);

    if (diff.inMinutes < 1) return AppStrings.justNow;
    if (diff.inHours < 1) return AppStrings.minutesAgo(diff.inMinutes);
    if (diff.inHours < 24) return AppStrings.hoursAgo(diff.inHours);

    final days = _calendarDaysBetween(local, reference);
    if (days <= 1) return AppStrings.yesterday;
    if (days < 7) return AppStrings.daysAgo(days);
    return date(local);
  }

  static int _calendarDaysBetween(DateTime from, DateTime to) {
    final start = DateTime(from.year, from.month, from.day);
    final end = DateTime(to.year, to.month, to.day);
    // round() absorve dias de 23/25 h em fusos com horário de verão.
    return (end.difference(start).inHours / 24).round();
  }
}
