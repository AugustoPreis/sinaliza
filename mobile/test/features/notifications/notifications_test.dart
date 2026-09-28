import 'package:cookie_jar/cookie_jar.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:mobile/src/core/config/app_version.dart';
import 'package:mobile/src/core/errors/app_failure.dart';
import 'package:mobile/src/core/l10n/app_strings.dart';
import 'package:mobile/src/core/network/api_client.dart';
import 'package:mobile/src/core/network/session_events.dart';
import 'package:mobile/src/core/router/router.dart';
import 'package:mobile/src/core/styles/app_theme.dart';
import 'package:mobile/src/features/auth/presentation/cubit/session_cubit.dart';
import 'package:mobile/src/features/home/presentation/pages/home_page.dart';
import 'package:mobile/src/features/notifications/data/datasources/notifications_remote_datasource.dart';
import 'package:mobile/src/features/notifications/data/repositories/notifications_repository_impl.dart';
import 'package:mobile/src/features/notifications/domain/notifications_refresh_signal.dart';
import 'package:mobile/src/features/notifications/domain/repositories/notifications_repository.dart';
import 'package:mobile/src/features/notifications/presentation/pages/notifications_page.dart';
import 'package:mobile/src/features/tickets/domain/repositories/tickets_repository.dart';
import 'package:mobile/src/features/tickets/presentation/pages/ticket_detail_page.dart';
import 'package:mobile/src/shared/domain/entities/app_notification.dart';
import 'package:mobile/src/shared/domain/entities/paged_result.dart';
import 'package:mobile/src/shared/domain/enums/notification_type.dart';
import 'package:mocktail/mocktail.dart';

import '../../core/network/fake_api.dart';
import '../../fixtures/fixture_reader.dart';
import '../../helpers/mocks.dart';
import '../auth/session_cubit_test.dart' show MockAuthRepository;

PagedResult<AppNotification> page(
  List<AppNotification> items, {
  int page = 1,
  int? total,
}) => PagedResult(
  items: items,
  page: page,
  pageSize: 30,
  total: total ?? items.length,
);

void main() {
  setUpAll(() async {
    registerMockFallbacks();
    await initializeDateFormatting('pt_BR');
  });

  group('repositório', () {
    test('GET /notifications?page=&perPage=30', () async {
      final api = FakeSinalizaApi();
      final events = SessionEventBus();
      addTearDown(events.dispose);
      api.routes['GET /notifications'] = (_) =>
          FakeReply.ok(fixture('api/notifications'));
      final repository = NotificationsRepositoryImpl(
        NotificationsRemoteDataSource(
          ApiClient(
            baseUrl: baseUrl,
            cookieJar: CookieJar(),
            sessionEvents: events,
            httpClientAdapter: api,
            enableLogging: false,
          ),
        ),
      );

      final result = await repository.getNotifications(page: 2);

      expect(api.requests.single.queryParameters, {'page': 2, 'perPage': 30});
      expect(result.items.first.type, NotificationType.ticketReassigned);
    });
  });

  group('tela', () {
    late MockNotificationsRepository repository;
    late MockTicketsRepository tickets;
    late NotificationsRefreshSignal signal;

    setUp(() {
      repository = MockNotificationsRepository();
      stubUnread(repository, 0);
      tickets = MockTicketsRepository();
      stubTicketDetail(tickets);
      stubEmptyTickets(tickets);
      signal = NotificationsRefreshSignal();
    });

    tearDown(() => signal.dispose());

    void stub(int pageNumber, Object result) {
      final call = when(() => repository.getNotifications(page: pageNumber));
      if (result is AppFailure) {
        call.thenThrow(result);
      } else {
        call.thenAnswer((_) async => result as PagedResult<AppNotification>);
      }
    }

    Future<void> pump(WidgetTester tester, Widget home) async {
      await tester.pumpWidget(
        MultiRepositoryProvider(
          providers: [
            RepositoryProvider<NotificationsRepository>.value(
              value: repository,
            ),
            RepositoryProvider<NotificationsRefreshSignal>.value(value: signal),
            RepositoryProvider<TicketsRepository>.value(value: tickets),
            // A home também monta o Perfil.
            RepositoryProvider<AppVersionProvider>.value(
              value: FakeAppVersion(),
            ),
          ],
          child: BlocProvider<SessionCubit>(
            create: (_) => SessionCubit(
              repository: MockAuthRepository(),
              sessionEvents: SessionEventBus(),
            ),
            child: MaterialApp(
              theme: appTheme,
              onGenerateRoute: AppRouter.generateRoute,
              home: home,
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
    }

    testWidgets('item com mensagem, protocolo e ícone por tipo', (
      tester,
    ) async {
      stub(
        1,
        page([
          buildNotification(1, type: NotificationType.ticketResolved),
          buildNotification(2, type: NotificationType.ticketReassigned),
        ]),
      );
      await pump(tester, const NotificationsPage());

      expect(find.text('Mensagem 1'), findsOneWidget);
      expect(find.text('#SIN-2001'), findsOneWidget);
      expect(find.byIcon(Icons.task_alt), findsOneWidget);
      expect(find.byIcon(Icons.forward), findsOneWidget);
    });

    testWidgets('vazio', (tester) async {
      stub(1, page(const []));
      await pump(tester, const NotificationsPage());
      expect(find.text(AppStrings.notificationsEmpty), findsOneWidget);
    });

    testWidgets('erro com "Tentar novamente"', (tester) async {
      stub(1, const NetworkFailure());
      await pump(tester, const NotificationsPage());
      expect(find.text(AppStrings.errorNetwork), findsOneWidget);

      stub(1, page([buildNotification(1)]));
      await tester.tap(find.text(AppStrings.retry));
      await tester.pumpAndSettle();
      expect(find.text('Mensagem 1'), findsOneWidget);
    });

    testWidgets('tocar abre o chamado certo (ticket_id)', (tester) async {
      stub(1, page([buildNotification(7)]));
      await pump(tester, const NotificationsPage());

      await tester.tap(find.text('Mensagem 7'));
      await tester.pumpAndSettle();

      expect(
        tester.widget<TicketDetailPage>(find.byType(TicketDetailPage)).ticketId,
        'ticket-7',
      );
      verify(() => tickets.getTicket('ticket-7')).called(1);
    });

    testWidgets('rolagem infinita até o total', (tester) async {
      stub(
        1,
        page([for (var i = 1; i <= 30; i++) buildNotification(i)], total: 32),
      );
      stub(
        2,
        page(
          [buildNotification(31), buildNotification(32)],
          page: 2,
          total: 32,
        ),
      );
      await pump(tester, const NotificationsPage());

      await tester.dragUntilVisible(
        find.text('Mensagem 32'),
        find.byType(ListView),
        const Offset(0, -600),
      );
      expect(find.text('Mensagem 32'), findsOneWidget);
      verifyNever(() => repository.getNotifications(page: 3));
    });

    testWidgets('na home: carrega só ao entrar na aba e recarrega a cada '
        'entrada', (tester) async {
      stub(1, page([buildNotification(1)]));
      await pump(tester, const HomePage());

      // Montada no IndexedStack, mas a aba ativa é "Chamados".
      verifyNever(() => repository.getNotifications(page: 1));

      await tester.tap(
        find.descendant(
          of: find.byType(NavigationBar),
          matching: find.text(AppStrings.tabNotifications),
        ),
      );
      await tester.pumpAndSettle();
      verify(() => repository.getNotifications(page: 1)).called(1);

      stub(1, page([buildNotification(9), buildNotification(1)]));
      await tester.tap(
        find.descendant(
          of: find.byType(NavigationBar),
          matching: find.text(AppStrings.tabTickets),
        ),
      );
      await tester.pumpAndSettle();
      await tester.tap(
        find.descendant(
          of: find.byType(NavigationBar),
          matching: find.text(AppStrings.tabNotifications),
        ),
      );
      await tester.pumpAndSettle();

      verify(() => repository.getNotifications(page: 1)).called(1);
      expect(find.text('Mensagem 9'), findsOneWidget);
    });

    testWidgets('sinal (push em primeiro plano) recarrega o histórico', (
      tester,
    ) async {
      stub(1, page([buildNotification(1)]));
      await pump(tester, const NotificationsPage());

      stub(1, page([buildNotification(5), buildNotification(1)]));
      await tester.runAsync(() async {
        signal.notify();
        await Future<void>.delayed(Duration.zero);
      });
      await tester.pumpAndSettle();

      expect(find.text('Mensagem 5'), findsOneWidget);
    });
  });
}
