import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/src/shared/domain/enums/institutional_link.dart';
import 'package:mobile/src/shared/domain/enums/notification_type.dart';
import 'package:mobile/src/shared/domain/enums/ticket_status.dart';
import 'package:mobile/src/shared/domain/enums/timeline_event_type.dart';

void main() {
  test('TicketStatus mapeia valores da API para rótulos', () {
    expect(TicketStatus.fromApi('OPEN').label, 'Aberto');
    expect(TicketStatus.fromApi('FORWARDED').label, 'Encaminhado');
    expect(TicketStatus.fromApi('IN_PROGRESS').label, 'Em andamento');
    expect(TicketStatus.fromApi('RESOLVED').label, 'Resolvido');
  });

  test(
    'TicketStatus desconhecido vira unknown (RECLASSIFIED não é status)',
    () {
      expect(TicketStatus.fromApi('RECLASSIFIED'), TicketStatus.unknown);
      expect(TicketStatus.fromApi(null), TicketStatus.unknown);
      expect(TicketStatus.fromApi('UNKNOWN'), TicketStatus.unknown);
      expect(TicketStatus.known, isNot(contains(TicketStatus.unknown)));
    },
  );

  test('InstitutionalLink mapeia rótulos e aceita null/desconhecido', () {
    expect(InstitutionalLink.fromApi('ALUNO')?.label, 'Aluno');
    expect(InstitutionalLink.fromApi('PROFESSOR')?.label, 'Professor');
    expect(InstitutionalLink.fromApi('SERVIDOR')?.label, 'Servidor');
    expect(InstitutionalLink.fromApi(null), isNull);
    expect(InstitutionalLink.fromApi('TERCEIRIZADO'), isNull);
  });

  test('TimelineEventType cobre todos os tipos da API + fallback', () {
    for (final raw in [
      'TICKET_OPENED',
      'AUTO_CLASSIFIED',
      'REQUESTER_CONFIRMED_SECTOR',
      'REQUESTER_CHANGED_SECTOR',
      'STATUS_CHANGED',
      'REASSIGNED',
      'TICKET_RESOLVED',
    ]) {
      final type = TimelineEventType.fromApi(raw);
      expect(type, isNot(TimelineEventType.unknown), reason: raw);
      expect(type.apiValue, raw);
    }
    expect(
      TimelineEventType.fromApi('RECLASSIFIED'),
      TimelineEventType.unknown,
    );
  });

  test('NotificationType cobre todos os tipos da API + fallback', () {
    expect(
      NotificationType.fromApi('TICKET_STATUS_CHANGED'),
      NotificationType.ticketStatusChanged,
    );
    expect(
      NotificationType.fromApi('TICKET_REASSIGNED'),
      NotificationType.ticketReassigned,
    );
    expect(
      NotificationType.fromApi('TICKET_RESOLVED'),
      NotificationType.ticketResolved,
    );
    expect(NotificationType.fromApi('NEW_TYPE'), NotificationType.unknown);
  });
}
