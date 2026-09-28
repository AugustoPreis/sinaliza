/// Tipo de notificação do solicitante (`type` em `GET /notifications`).
/// Valores novos viram [unknown].
enum NotificationType {
  ticketStatusChanged('TICKET_STATUS_CHANGED'),
  ticketReassigned('TICKET_REASSIGNED'),
  ticketResolved('TICKET_RESOLVED'),
  unknown('UNKNOWN');

  const NotificationType(this.apiValue);

  final String apiValue;

  static NotificationType fromApi(String? value) {
    for (final type in values) {
      if (type != unknown && type.apiValue == value) return type;
    }
    return unknown;
  }
}
