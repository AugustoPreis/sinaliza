import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/src/core/utils/json.dart';
import 'package:mobile/src/shared/data/models/notification_model.dart';
import 'package:mobile/src/shared/data/models/paged_result_model.dart';
import 'package:mobile/src/shared/data/models/reference_models.dart';
import 'package:mobile/src/shared/data/models/ticket_models.dart';
import 'package:mobile/src/shared/data/models/user_model.dart';
import 'package:mobile/src/shared/domain/entities/building.dart';
import 'package:mobile/src/shared/domain/entities/refs.dart';
import 'package:mobile/src/shared/domain/entities/user.dart';
import 'package:mobile/src/shared/domain/enums/institutional_link.dart';
import 'package:mobile/src/shared/domain/enums/notification_type.dart';
import 'package:mobile/src/shared/domain/enums/ticket_status.dart';
import 'package:mobile/src/shared/domain/enums/timeline_event_type.dart';

import '../fixtures/fixture_reader.dart';

void main() {
  const ti = SectorRef(id: 'a1b2c3d4-0000-4000-8000-000000000001', name: 'TI');
  const manutencao = SectorRef(
    id: 'a1b2c3d4-0000-4000-8000-000000000002',
    name: 'Manutenção Predial',
  );

  group('User (camelCase)', () {
    test('GET /auth/me', () {
      final user = UserModel.fromJson(fixture('api/auth_me'));

      expect(user.uuid, '0b1f7a52-5c1e-4e59-9d0a-6c1f0e7d2a11');
      expect(user.name, 'Maria Silva');
      expect(user.institutionalLink, InstitutionalLink.student);
      expect(user.status, 'ACTIVE');
      expect(user.roles, [
        const UserRole(
          uuid: '7d3c1e0f-2b8a-4a61-9f0e-1c2d3e4f5a6b',
          name: 'REQUESTER',
        ),
      ]);
      expect(user.canUseRequesterApp, isTrue);
    });

    test('login: data.user, vínculo null e sem tickets:create', () {
      final user = UserModel.fromLoginJson(fixture('api/auth_login'));

      expect(user.institutionalLink, isNull);
      expect(user.canUseRequesterApp, isFalse);
      expect(user.hasPermission('users:manage'), isTrue);
    });
  });

  group('dados de referência', () {
    for (final source in ['api', 'docs']) {
      test('GET /locations ($source)', () {
        final buildings = BuildingModel.listFromJson(
          fixture('$source/locations'),
        );
        expect(buildings.first.name, 'Bloco A');
        expect(buildings.first.environments, hasLength(2));
        expect(buildings.first.environments.last.name, 'Corredor térreo');
      });

      test('GET /sectors ($source)', () {
        final sectors = SectorRefModel.listFromJson(fixture('$source/sectors'));
        expect(sectors.first.name, 'TI');
        expect(sectors[1].name, 'Manutenção Predial');
      });

      test('POST /classification/preview ($source)', () {
        final result = ClassificationResultModel.fromJson(
          fixture('$source/classification_preview'),
        );
        expect(result.automaticSector.name, 'TI');
        expect(result.confidence, source == 'api' ? 0.87 : 0.91);
      });
    }

    test('prédio sem ambientes', () {
      final buildings = BuildingModel.listFromJson(fixture('api/locations'));
      expect(
        buildings.last,
        const Building(
          id: 'c8f2d3e4-5a6b-4c7d-9e8f-0a1b2c3d4e5f',
          name: 'Biblioteca Central',
          environments: [],
        ),
      );
    });

    test('classificação sem confidence', () {
      final result = ClassificationResultModel.fromJson({
        'automatic_sector': {'id': 's1', 'name': 'TI'},
      });
      expect(result.confidence, isNull);
    });
  });

  group('chamados (snake_case)', () {
    test('GET /tickets (api): itens, datas locais e paginação', () {
      final page = PagedResultModel.fromJson(
        fixture('api/tickets_list'),
        TicketListItemModel.fromJson,
      );

      expect(page.items, hasLength(2));
      expect(page.page, 1);
      expect(page.pageSize, 2);
      expect(page.total, 5);
      expect(page.hasMore, isTrue);

      final first = page.items.first;
      expect(first.protocol, 'SIN-1042');
      expect(first.status, TicketStatus.inProgress);
      expect(first.currentSector, ti);
      expect(first.descriptionSummary, endsWith('…'));
      expect(first.createdAt.isUtc, isFalse);
      expect(first.createdAt, DateTime.utc(2026, 8, 20, 14, 30).toLocal());
      expect(
        page.items.last.createdAt,
        DateTime.utc(2026, 8, 21, 9, 5, 12, 345).toLocal(),
      );
    });

    test('GET /tickets (docs)', () {
      final page = PagedResultModel.fromJson(
        fixture('docs/tickets_list'),
        TicketListItemModel.fromJson,
      );
      expect(
        page.items.single.descriptionSummary,
        'O projetor da sala não está ligando',
      );
      expect(page.hasMore, isFalse);
    });

    for (final source in ['api', 'docs']) {
      test('POST /tickets ($source)', () {
        final created = TicketCreatedModel.fromJson(
          fixture('$source/ticket_created'),
        );
        expect(created.protocol, startsWith('SIN-'));
        expect(created.status, TicketStatus.forwarded);
        expect(created.createdAt.isUtc, isFalse);
        if (source == 'api') {
          expect(created.requesterCorrected, isTrue);
          expect(created.automaticSector, ti);
          expect(created.confirmedSector, manutencao);
        } else {
          expect(created.requesterCorrected, isFalse);
        }
      });

      test('GET /tickets/{id} ($source)', () {
        final detail = TicketDetailModel.fromJson(
          fixture('$source/ticket_detail'),
        );
        expect(detail.protocol, 'SIN-1042');
        expect(detail.location.building.name, 'Bloco A');
        expect(detail.location.environment.name, 'Sala 101');
        expect(detail.photos, hasLength(1));
        expect(detail.status, TicketStatus.inProgress);
        expect(detail.timeline.first.type, TimelineEventType.ticketOpened);
      });
    }

    test('detalhe (api): linha do tempo completa com textos da API', () {
      final detail = TicketDetailModel.fromJson(fixture('api/ticket_detail'));

      expect(detail.timeline.map((e) => e.type), [
        TimelineEventType.ticketOpened,
        TimelineEventType.autoClassified,
        TimelineEventType.requesterConfirmedSector,
        TimelineEventType.statusChanged,
        TimelineEventType.reassigned,
        TimelineEventType.statusChanged,
      ]);
      expect(
        detail.timeline[4].description,
        'Redirecionado para TI: equipamento de projeção.',
      );
      expect(detail.currentSector, ti);
      expect(detail.automaticSector, manutencao);
    });

    test('detalhe ignora internal_note se vier', () {
      final json = fixture('api/ticket_detail')..['internal_note'] = 'segredo';
      final detail = TicketDetailModel.fromJson(json);
      expect(detail.props.toString(), isNot(contains('segredo')));
    });
  });

  group('notificações', () {
    test('GET /notifications (api)', () {
      final page = PagedResultModel.fromJson(
        fixture('api/notifications'),
        AppNotificationModel.fromJson,
      );
      expect(page.items.first.type, NotificationType.ticketReassigned);
      expect(page.items.first.ticketId, 'd4c3b2a1-1111-4111-8111-111111111111');
      expect(page.hasMore, isFalse);
    });

    test('GET /notifications (docs, sem paginação no exemplo)', () {
      final page = PagedResultModel.fromJson(
        fixture('docs/notifications'),
        AppNotificationModel.fromJson,
      );
      final item = page.items.single;
      expect(item.type, NotificationType.ticketResolved);
      expect(item.message, 'Seu chamado SIN-1042 foi resolvido.');
      expect(page.page, 1);
      expect(page.total, 1);
      expect(page.hasMore, isFalse);
    });
  });

  group('robustez', () {
    test(
      'status, tipo de evento e de notificação desconhecidos não quebram',
      () {
        final json = fixture('api/ticket_detail')
          ..['status'] = 'ON_HOLD'
          ..['timeline'] = [
            {'type': 'RECLASSIFIED', 'created_at': '2026-08-20T14:30:00Z'},
          ];
        final detail = TicketDetailModel.fromJson(json);

        expect(detail.status, TicketStatus.unknown);
        expect(detail.timeline.single.type, TimelineEventType.unknown);
        expect(detail.timeline.single.description, '');

        final notification = AppNotificationModel.fromJson(
          fixture('api/notifications')['items'][0] as Json..['type'] = 'X',
        );
        expect(notification.type, NotificationType.unknown);
      },
    );

    test('campo obrigatório ausente lança FormatException com o nome', () {
      final json = fixture('api/ticket_created')..remove('protocol');
      expect(
        () => TicketCreatedModel.fromJson(json),
        throwsA(
          isA<FormatException>().having(
            (e) => e.message,
            'message',
            contains('"protocol"'),
          ),
        ),
      );
    });

    test('data inválida lança FormatException', () {
      final json = fixture('api/ticket_created')..['created_at'] = 'ontem';
      expect(() => TicketCreatedModel.fromJson(json), throwsFormatException);
    });

    test('listas ausentes viram vazias', () {
      final json = fixture('api/ticket_detail')
        ..remove('photos')
        ..remove('timeline');
      final detail = TicketDetailModel.fromJson(json);
      expect(detail.photos, isEmpty);
      expect(detail.timeline, isEmpty);
    });

    test('asJson rejeita resposta que não é objeto', () {
      expect(() => asJson([1, 2]), throwsFormatException);
      expect(asJson({'a': 1}), {'a': 1});
    });
  });

  test('modelos são imutáveis e comparáveis por valor', () {
    final a = UserModel.fromJson(fixture('api/auth_me'));
    final b = UserModel.fromJson(fixture('api/auth_me'));
    expect(a, b);
    expect(() => a.permissions.add('x'), throwsUnsupportedError);
    expect(User.requesterPermission, 'tickets:create');
  });
}
