import 'package:mobile/src/core/l10n/app_strings.dart';
import 'package:mobile/src/shared/domain/enums/ticket_status.dart';

/// Abas da tela A.2 e o filtro `status` correspondente em `GET /tickets`.
///
/// Não usa `resolved=false`: no backend o parâmetro passa por
/// `@Type(() => Boolean)` e `"false"` vira `true` (README, dependência 4).
enum TicketFilter {
  all(AppStrings.ticketsTabAll, AppStrings.ticketsEmptyAll, []),
  open(AppStrings.ticketsTabOpen, AppStrings.ticketsEmptyOpen, [
    TicketStatus.open,
    TicketStatus.forwarded,
    TicketStatus.inProgress,
  ]),
  resolved(AppStrings.ticketsTabResolved, AppStrings.ticketsEmptyResolved, [
    TicketStatus.resolved,
  ]);

  const TicketFilter(this.label, this.emptyMessage, this.statuses);

  final String label;
  final String emptyMessage;

  /// Vazio = sem filtro.
  final List<TicketStatus> statuses;

  /// Valor da query `status` (separado por vírgula) ou `null` para "Todos".
  String? get queryValue =>
      statuses.isEmpty ? null : statuses.map((s) => s.apiValue).join(',');
}
