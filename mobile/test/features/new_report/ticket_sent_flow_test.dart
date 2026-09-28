import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:mobile/src/core/l10n/app_strings.dart';
import 'package:mobile/src/core/router/router.dart';
import 'package:mobile/src/core/styles/app_theme.dart';
import 'package:mobile/src/features/new_report/data/services/photo_picker.dart';
import 'package:mobile/src/features/new_report/data/services/photo_processor.dart';
import 'package:mobile/src/features/new_report/domain/repositories/classification_repository.dart';
import 'package:mobile/src/features/new_report/presentation/pages/new_report_page.dart';
import 'package:mobile/src/features/new_report/presentation/pages/ticket_sent_page.dart';
import 'package:mobile/src/features/reference_data/domain/repositories/reference_data_repositories.dart';
import 'package:mobile/src/features/tickets/domain/entities/new_ticket_request.dart';
import 'package:mobile/src/features/tickets/domain/repositories/tickets_repository.dart';
import 'package:mobile/src/features/tickets/presentation/pages/my_tickets_page.dart';
import 'package:mobile/src/features/tickets/presentation/pages/ticket_detail_page.dart';
import 'package:mobile/src/shared/domain/entities/classification_result.dart';
import 'package:mobile/src/shared/domain/entities/ticket.dart';
import 'package:mobile/src/shared/domain/enums/ticket_status.dart';
import 'package:mocktail/mocktail.dart';

import '../../helpers/mocks.dart';
import 'confirm_sector_cubit_test.dart' show createdFor, manutencao, ti;

void main() {
  late MockTicketsRepository tickets;
  late MockLocationsRepository locations;
  late MockSectorsRepository sectors;
  late MockClassificationRepository classification;
  late FakePhotoPicker picker;
  late FakePhotoProcessor processor;
  late List<TicketListItem> serverTickets;

  setUpAll(() async {
    registerMockFallbacks();
    registerFallbackValue(
      const NewTicketRequest(
        description: '',
        buildingId: '',
        environmentId: '',
        automaticSectorId: '',
        confirmedSectorId: '',
      ),
    );
    await initializeDateFormatting('pt_BR');
  });

  setUp(() {
    serverTickets = [];
    tickets = MockTicketsRepository();
    stubTicketDetail(tickets);
    locations = MockLocationsRepository();
    sectors = MockSectorsRepository();
    classification = MockClassificationRepository();
    picker = FakePhotoPicker()..cameraResult = '/camera/1.jpg';
    processor = FakePhotoProcessor();

    when(
      () => tickets.getMyTickets(
        filter: any(named: 'filter'),
        page: any(named: 'page'),
      ),
    ).thenAnswer((_) async => buildPage(List.of(serverTickets)));
    when(
      () => tickets.createTicket(any(), onProgress: any(named: 'onProgress')),
    ).thenAnswer((invocation) async {
      final created = createdFor(
        invocation.positionalArguments.first as NewTicketRequest,
      );
      // O servidor passa a devolver o chamado novo no topo.
      serverTickets.insert(
        0,
        TicketListItem(
          id: created.id,
          protocol: created.protocol,
          descriptionSummary: 'O projetor não liga',
          currentSector: created.currentSector,
          status: TicketStatus.forwarded,
          createdAt: DateTime.now(),
        ),
      );
      return created;
    });
    when(
      () => locations.getBuildings(forceRefresh: any(named: 'forceRefresh')),
    ).thenAnswer((_) async => [bloco]);
    when(
      () => sectors.getSectors(forceRefresh: any(named: 'forceRefresh')),
    ).thenAnswer((_) async => [manutencao, ti]);
    when(
      () => classification.preview(any()),
    ).thenAnswer((_) async => const ClassificationResult(automaticSector: ti));
  });

  /// "Meus chamados" -> A.3 -> A.4 -> enviar -> A.5.
  Future<void> createTicketFromList(WidgetTester tester) async {
    tester.view
      ..physicalSize = const Size(800, 2000)
      ..devicePixelRatio = 1;
    addTearDown(tester.view.reset);

    await tester.pumpWidget(
      MultiRepositoryProvider(
        providers: [
          RepositoryProvider<TicketsRepository>.value(value: tickets),
          RepositoryProvider<LocationsRepository>.value(value: locations),
          RepositoryProvider<SectorsRepository>.value(value: sectors),
          RepositoryProvider<ClassificationRepository>.value(
            value: classification,
          ),
          RepositoryProvider<PhotoPicker>.value(value: picker),
          RepositoryProvider<PhotoProcessor>.value(value: processor),
        ],
        child: MaterialApp(
          theme: appTheme,
          onGenerateRoute: AppRouter.generateRoute,
          home: const MyTicketsPage(),
        ),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text(AppStrings.ticketsEmptyAll), findsOneWidget);

    await tester.tap(find.byType(FloatingActionButton));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField).first, 'O projetor não liga');
    for (final (field, option) in [
      (AppStrings.reportBuildingLabel, 'Bloco A'),
      (AppStrings.reportEnvironmentLabel, 'Sala 101'),
    ]) {
      await tester.tap(find.text(field).last);
      await tester.pumpAndSettle();
      await tester.tap(find.text(option).last);
      await tester.pumpAndSettle();
    }
    await tester.tap(find.text(AppStrings.reportAddFromCamera));
    await tester.pumpAndSettle();
    await tester.tap(
      find.widgetWithText(FilledButton, AppStrings.reportContinue),
    );
    await tester.pumpAndSettle();
    await tester.tap(
      find.widgetWithText(FilledButton, AppStrings.confirmSubmit),
    );
    await tester.pumpAndSettle();
    expect(find.byType(TicketSentPage), findsOneWidget);
  }

  testWidgets('mostra protocolo e setor de destino da resposta, sem chamada '
      'extra', (tester) async {
    await createTicketFromList(tester);

    expect(find.text(AppStrings.ticketSentHeadline), findsOneWidget);
    expect(find.text('#SIN-1050'), findsOneWidget);
    expect(find.text('TI'), findsOneWidget); // current_sector
    verify(
      () => tickets.createTicket(any(), onProgress: any(named: 'onProgress')),
    ).called(1);
    // A.5 não busca nada: além da criação, só as listas da A.2.
    verify(
      () => tickets.getMyTickets(
        filter: any(named: 'filter'),
        page: any(named: 'page'),
      ),
    ).called(greaterThanOrEqualTo(1));
    verifyNoMoreInteractions(tickets);
  });

  testWidgets('o cubit do fluxo foi descartado (fotos temporárias apagadas)', (
    tester,
  ) async {
    await createTicketFromList(tester);
    expect(find.byType(NewReportPage), findsNothing);
    expect(processor.discarded.single.path, '/camera/1.jpg.compressed.jpg');
  });

  testWidgets('"Voltar para meus chamados" mostra o chamado novo na lista', (
    tester,
  ) async {
    await createTicketFromList(tester);

    await tester.tap(find.text(AppStrings.ticketSentBackToList));
    await tester.pumpAndSettle();

    expect(find.byType(MyTicketsPage), findsOneWidget);
    expect(find.text('#SIN-1050'), findsOneWidget);
    expect(find.text(AppStrings.ticketsEmptyAll), findsNothing);
  });

  testWidgets('voltar do Android leva à lista, nunca ao formulário', (
    tester,
  ) async {
    await createTicketFromList(tester);

    await tester.binding.handlePopRoute(); // voltar do Android
    await tester.pumpAndSettle();

    expect(find.byType(MyTicketsPage), findsOneWidget);
    expect(find.byType(NewReportPage), findsNothing);
    expect(find.text('#SIN-1050'), findsOneWidget);
  });

  testWidgets('"Ver chamado" abre o detalhe certo; voltar vai para a lista', (
    tester,
  ) async {
    await createTicketFromList(tester);

    await tester.tap(find.text(AppStrings.ticketSentViewTicket));
    await tester.pumpAndSettle();

    final detail = tester.widget<TicketDetailPage>(
      find.byType(TicketDetailPage),
    );
    expect(detail.ticketId, 't-1');

    await tester.pageBack();
    await tester.pumpAndSettle();
    expect(find.byType(MyTicketsPage), findsOneWidget);
    expect(find.byType(TicketSentPage), findsNothing);
  });
}
