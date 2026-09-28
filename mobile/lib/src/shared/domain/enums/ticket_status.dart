import 'package:mobile/src/core/l10n/app_strings.dart';

/// Status de um chamado, como vem da API (`status`).
///
/// `RECLASSIFIED` não é status (RB-06): é só um evento da linha do tempo.
/// Valores novos/desconhecidos viram [unknown], sem quebrar o parse.
enum TicketStatus {
  open('OPEN', AppStrings.statusOpen),
  forwarded('FORWARDED', AppStrings.statusForwarded),
  inProgress('IN_PROGRESS', AppStrings.statusInProgress),
  resolved('RESOLVED', AppStrings.statusResolved),
  unknown('UNKNOWN', AppStrings.statusUnknown);

  const TicketStatus(this.apiValue, this.label);

  final String apiValue;
  final String label;

  /// Status que o app mostra nos filtros (sem [unknown]).
  static const List<TicketStatus> known = [
    open,
    forwarded,
    inProgress,
    resolved,
  ];

  static TicketStatus fromApi(String? value) {
    for (final status in known) {
      if (status.apiValue == value) return status;
    }
    return unknown;
  }
}
