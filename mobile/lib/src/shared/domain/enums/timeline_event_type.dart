/// Tipo de evento da linha do tempo do chamado (`timeline[].type`).
///
/// O texto exibido vem pronto da API (`description`, em pt-BR); o tipo serve
/// para escolher ícone/cor. Valores novos viram [unknown].
enum TimelineEventType {
  ticketOpened('TICKET_OPENED'),
  autoClassified('AUTO_CLASSIFIED'),
  requesterConfirmedSector('REQUESTER_CONFIRMED_SECTOR'),
  requesterChangedSector('REQUESTER_CHANGED_SECTOR'),
  statusChanged('STATUS_CHANGED'),
  reassigned('REASSIGNED'),
  ticketResolved('TICKET_RESOLVED'),
  unknown('UNKNOWN');

  const TimelineEventType(this.apiValue);

  final String apiValue;

  static TimelineEventType fromApi(String? value) {
    for (final type in values) {
      if (type != unknown && type.apiValue == value) return type;
    }
    return unknown;
  }
}
