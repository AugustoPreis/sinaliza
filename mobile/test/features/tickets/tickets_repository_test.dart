import 'package:cookie_jar/cookie_jar.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/src/core/errors/app_failure.dart';
import 'package:mobile/src/core/network/api_client.dart';
import 'package:mobile/src/core/network/session_events.dart';
import 'package:mobile/src/features/tickets/data/datasources/tickets_remote_datasource.dart';
import 'package:mobile/src/features/tickets/data/repositories/tickets_repository_impl.dart';
import 'package:mobile/src/features/tickets/domain/ticket_filter.dart';
import 'package:mobile/src/shared/domain/enums/ticket_status.dart';

import '../../core/network/fake_api.dart';
import '../../fixtures/fixture_reader.dart';

void main() {
  late FakeSinalizaApi api;
  late SessionEventBus events;
  late TicketsRepositoryImpl repository;

  setUp(() {
    api = FakeSinalizaApi();
    events = SessionEventBus();
    repository = TicketsRepositoryImpl(
      TicketsRemoteDataSource(
        ApiClient(
          baseUrl: baseUrl,
          cookieJar: CookieJar(),
          sessionEvents: events,
          httpClientAdapter: api,
          enableLogging: false,
        ),
      ),
    );
    api.routes['GET /tickets'] = (_) =>
        FakeReply.ok(fixture('api/tickets_list'));
  });

  tearDown(() => events.dispose());

  Map<String, dynamic> lastQuery() => api.requests.last.queryParameters;

  test('"Todos" não envia status e sempre envia perPage=20', () async {
    await repository.getMyTickets(filter: TicketFilter.all, page: 1);
    expect(lastQuery(), {'page': 1, 'perPage': 20});
  });

  test(
    '"Abertos" envia OPEN,FORWARDED,IN_PROGRESS (nunca resolved=false)',
    () async {
      await repository.getMyTickets(filter: TicketFilter.open, page: 2);
      expect(lastQuery(), {
        'page': 2,
        'perPage': 20,
        'status': 'OPEN,FORWARDED,IN_PROGRESS',
      });
      expect(api.requests.last.uri.query, isNot(contains('resolved')));
    },
  );

  test('"Resolvidos" envia status=RESOLVED', () async {
    await repository.getMyTickets(filter: TicketFilter.resolved, page: 1);
    expect(lastQuery()['status'], 'RESOLVED');
  });

  test('converte a resposta paginada', () async {
    final page = await repository.getMyTickets(
      filter: TicketFilter.all,
      page: 1,
    );
    expect(page.items.first.status, TicketStatus.inProgress);
    expect(page.total, 5);
    expect(page.hasMore, isTrue);
  });

  test('payload inválido -> UnknownFailure', () {
    api.routes['GET /tickets'] = (_) => FakeReply.ok({
      'items': [
        {'id': 'sem protocolo'},
      ],
    });
    expect(
      repository.getMyTickets(filter: TicketFilter.all, page: 1),
      throwsA(isA<UnknownFailure>()),
    );
  });
}
