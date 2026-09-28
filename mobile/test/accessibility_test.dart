import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:mobile/src/core/config/app_version.dart';
import 'package:mobile/src/core/network/session_events.dart';
import 'package:mobile/src/core/router/router.dart';
import 'package:mobile/src/core/styles/app_theme.dart';
import 'package:mobile/src/features/auth/domain/repositories/auth_repository.dart';
import 'package:mobile/src/features/auth/presentation/cubit/session_cubit.dart';
import 'package:mobile/src/features/auth/presentation/pages/login_page.dart';
import 'package:mobile/src/features/new_report/data/services/photo_picker.dart';
import 'package:mobile/src/features/new_report/data/services/photo_processor.dart';
import 'package:mobile/src/features/new_report/domain/repositories/classification_repository.dart';
import 'package:mobile/src/features/new_report/presentation/cubit/new_report_cubit.dart';
import 'package:mobile/src/features/new_report/presentation/pages/confirm_sector_page.dart';
import 'package:mobile/src/features/new_report/presentation/pages/new_report_page.dart';
import 'package:mobile/src/features/new_report/presentation/pages/ticket_sent_page.dart';
import 'package:mobile/src/features/notifications/domain/notifications_refresh_signal.dart';
import 'package:mobile/src/features/notifications/domain/repositories/notifications_repository.dart';
import 'package:mobile/src/features/notifications/presentation/pages/notifications_page.dart';
import 'package:mobile/src/features/profile/presentation/pages/profile_page.dart';
import 'package:mobile/src/features/reference_data/domain/repositories/reference_data_repositories.dart';
import 'package:mobile/src/features/tickets/domain/repositories/tickets_repository.dart';
import 'package:mobile/src/features/tickets/presentation/pages/my_tickets_page.dart';
import 'package:mobile/src/features/tickets/presentation/pages/ticket_detail_page.dart';
import 'package:mobile/src/features/tickets/presentation/widgets/ticket_photos.dart';
import 'package:mobile/src/shared/domain/entities/building.dart';
import 'package:mobile/src/shared/domain/entities/classification_result.dart';
import 'package:mobile/src/shared/domain/entities/refs.dart';
import 'package:mobile/src/shared/domain/entities/ticket.dart';
import 'package:mobile/src/shared/domain/enums/notification_type.dart';
import 'package:mobile/src/shared/domain/enums/ticket_status.dart';
import 'package:mocktail/mocktail.dart';

import 'features/auth/session_cubit_test.dart' show MockAuthRepository;
import 'helpers/mocks.dart';
import 'helpers/test_data.dart';

/// Diretrizes de acessibilidade (alvos de toque ≥ 48 dp, rótulos em ações e
/// contraste de texto) e fonte grande sem overflow, nas telas principais.
void main() {
  late MockAuthRepository auth;
  late MockTicketsRepository tickets;
  late MockLocationsRepository locations;
  late MockNotificationsRepository notifications;
  late MockSectorsRepository sectors;
  late SessionEventBus events;
  late SessionCubit session;

  setUpAll(() async {
    registerMockFallbacks();
    await initializeDateFormatting('pt_BR');
    ticketPhotoProvider = (_) => const AssetImage('missing.png');
  });

  setUp(() async {
    auth = MockAuthRepository();
    tickets = MockTicketsRepository();
    locations = MockLocationsRepository();
    events = SessionEventBus();
    session = SessionCubit(repository: auth, sessionEvents: events);
    await session.loggedIn(requester);

    when(
      () => tickets.getMyTickets(
        filter: any(named: 'filter'),
        page: any(named: 'page'),
      ),
    ).thenAnswer(
      (_) async => buildPage([
        buildTicket(1, status: TicketStatus.inProgress),
        buildTicket(2, status: TicketStatus.resolved, sector: 'Manutenção'),
      ]),
    );
    stubTicketDetail(tickets);
    when(
      () => locations.getBuildings(forceRefresh: any(named: 'forceRefresh')),
    ).thenAnswer((_) async => [bloco]);
    sectors = MockSectorsRepository();
    when(
      () => sectors.getSectors(forceRefresh: any(named: 'forceRefresh')),
    ).thenAnswer(
      (_) async => const [
        SectorRef(id: 's1', name: 'Manutenção Predial'),
        SectorRef(id: 's2', name: 'TI'),
      ],
    );
    notifications = MockNotificationsRepository();
    when(
      () => notifications.getNotifications(page: any(named: 'page')),
    ).thenAnswer(
      (_) async => buildPageOf([
        buildNotification(1, type: NotificationType.ticketResolved),
        buildNotification(2, type: NotificationType.ticketReassigned),
      ]),
    );
  });

  tearDown(() async {
    await session.close();
    await events.dispose();
  });

  Future<void> pump(
    WidgetTester tester,
    Widget page, {
    double textScale = 1,
  }) async {
    tester.view
      ..physicalSize = const Size(1080, 2340)
      ..devicePixelRatio = 3; // 360 x 780 dp, um celular comum
    addTearDown(tester.view.reset);
    await tester.pumpWidget(
      MultiRepositoryProvider(
        providers: [
          RepositoryProvider<AuthRepository>.value(value: auth),
          RepositoryProvider<TicketsRepository>.value(value: tickets),
          RepositoryProvider<LocationsRepository>.value(value: locations),
          RepositoryProvider<ClassificationRepository>.value(
            value: MockClassificationRepository(),
          ),
          RepositoryProvider<PhotoPicker>.value(value: FakePhotoPicker()),
          RepositoryProvider<PhotoProcessor>.value(value: FakePhotoProcessor()),
          RepositoryProvider<NotificationsRepository>.value(
            value: notifications,
          ),
          RepositoryProvider<NotificationsRefreshSignal>.value(
            value: NotificationsRefreshSignal(),
          ),
          RepositoryProvider<AppVersionProvider>.value(value: FakeAppVersion()),
          RepositoryProvider<SectorsRepository>.value(value: sectors),
        ],
        child: BlocProvider.value(
          value: session,
          child: MaterialApp(
            theme: appTheme,
            onGenerateRoute: AppRouter.generateRoute,
            builder: (context, child) => MediaQuery(
              data: MediaQuery.of(
                context,
              ).copyWith(textScaler: TextScaler.linear(textScale)),
              child: child!,
            ),
            home: page,
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
  }

  final screens = <String, Widget>{
    'A.1 Login': const LoginPage(),
    'A.2 Meus chamados': const MyTicketsPage(),
    'A.3 Novo relato': const NewReportPage(),
    'A.4 Confirmação do setor': Builder(
      builder: (context) {
        // Fluxo já classificado (como se viesse da A.3).
        final flow =
            NewReportCubit(
              locations: context.read<LocationsRepository>(),
              classification: context.read<ClassificationRepository>(),
              photoPicker: context.read<PhotoPicker>(),
              photoProcessor: context.read<PhotoProcessor>(),
            )..emit(
              const NewReportState(
                description: 'O projetor da sala 101 não liga',
                building: bloco,
                environment: Environment(id: 'e1', name: 'Sala 101'),
                classification: ClassificationResult(
                  automaticSector: SectorRef(
                    id: 's1',
                    name: 'Manutenção Predial',
                  ),
                ),
              ),
            );
        return BlocProvider.value(
          value: flow,
          child: const ConfirmSectorPage(),
        );
      },
    ),
    'A.5 Chamado enviado': TicketSentPage(
      ticket: TicketCreated(
        id: 't-1',
        protocol: 'SIN-1042',
        status: TicketStatus.forwarded,
        automaticSector: const SectorRef(id: 's', name: 'TI'),
        confirmedSector: const SectorRef(id: 's', name: 'TI'),
        currentSector: const SectorRef(id: 's', name: 'TI'),
        requesterCorrected: false,
        createdAt: DateTime(2026, 9, 1),
      ),
    ),
    'A.6 Detalhe': const TicketDetailPage(ticketId: 't-1'),
    'A.7 Notificações': const NotificationsPage(),
    'A.8 Perfil': const ProfilePage(),
  };

  for (final MapEntry(key: name, value: page) in screens.entries) {
    group(name, () {
      testWidgets('alvos de toque ≥ 48 dp e ações com rótulo', (tester) async {
        final handle = tester.ensureSemantics();
        await pump(tester, page);

        await expectLater(tester, meetsGuideline(androidTapTargetGuideline));
        await expectLater(tester, meetsGuideline(iOSTapTargetGuideline));
        await expectLater(tester, meetsGuideline(labeledTapTargetGuideline));
        handle.dispose();
      });

      testWidgets('contraste de texto', (tester) async {
        final handle = tester.ensureSemantics();
        await pump(tester, page);
        await expectLater(tester, meetsGuideline(textContrastGuideline));
        handle.dispose();
      });

      testWidgets('fonte grande (200%) sem overflow', (tester) async {
        await pump(tester, page, textScale: 2);
        expect(tester.takeException(), isNull);
      });
    });
  }

  // O TabBar não estoura: ele corta o rótulo com fade ("Resolv..."), que o
  // teste de overflow acima não pega.
  testWidgets('A.2: com fonte grande as abas rolam em vez de cortar', (
    tester,
  ) async {
    await pump(tester, const MyTicketsPage(), textScale: 2);
    expect(tester.widget<TabBar>(find.byType(TabBar)).isScrollable, isTrue);

    await pump(tester, const MyTicketsPage());
    expect(tester.widget<TabBar>(find.byType(TabBar)).isScrollable, isFalse);
  });
}
