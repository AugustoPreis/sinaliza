import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:mobile/src/core/errors/app_failure.dart';
import 'package:mobile/src/core/l10n/app_strings.dart';
import 'package:mobile/src/core/router/router.dart';
import 'package:mobile/src/core/styles/app_theme.dart';
import 'package:mobile/src/features/new_report/data/services/photo_picker.dart';
import 'package:mobile/src/features/new_report/data/services/photo_processor.dart';
import 'package:mobile/src/features/new_report/domain/repositories/classification_repository.dart';
import 'package:mobile/src/features/reference_data/domain/repositories/reference_data_repositories.dart';
import 'package:mobile/src/features/tickets/domain/repositories/tickets_repository.dart';
import 'package:mobile/src/features/tickets/domain/ticket_filter.dart';
import 'package:mobile/src/features/tickets/presentation/pages/my_tickets_page.dart';
import 'package:mobile/src/features/tickets/presentation/pages/ticket_detail_page.dart';
import 'package:mobile/src/shared/domain/enums/ticket_status.dart';
import 'package:mobile/src/shared/domain/entities/paged_result.dart';
import 'package:mobile/src/shared/domain/entities/ticket.dart';
import 'package:mocktail/mocktail.dart';

import '../../helpers/mocks.dart';

void main() {
  late MockTicketsRepository repository;

  setUpAll(() async {
    registerMockFallbacks();
    await initializeDateFormatting('pt_BR');
  });

  setUp(() {
    repository = MockTicketsRepository();
    stubTicketDetail(repository);
  });

  void stub(TicketFilter filter, int page, Object result) {
    final call = when(
      () => repository.getMyTickets(filter: filter, page: page),
    );
    if (result is AppFailure) {
      call.thenThrow(result);
    } else {
      call.thenAnswer((_) async => result as PagedResult<TicketListItem>);
    }
  }

  Future<void> pumpPage(WidgetTester tester) async {
    final locations = MockLocationsRepository();
    when(
      () => locations.getBuildings(forceRefresh: any(named: 'forceRefresh')),
    ).thenAnswer((_) async => [bloco]);
    await tester.pumpWidget(
      MultiRepositoryProvider(
        providers: [
          RepositoryProvider<TicketsRepository>.value(value: repository),
          // Usados pela A.3 aberta pelo "Novo relato".
          RepositoryProvider<LocationsRepository>.value(value: locations),
          RepositoryProvider<ClassificationRepository>.value(
            value: MockClassificationRepository(),
          ),
          RepositoryProvider<PhotoPicker>.value(value: FakePhotoPicker()),
          RepositoryProvider<PhotoProcessor>.value(value: FakePhotoProcessor()),
        ],
        child: MaterialApp(
          theme: appTheme,
          onGenerateRoute: AppRouter.generateRoute,
          home: const MyTicketsPage(),
        ),
      ),
    );
    await tester.pumpAndSettle();
  }

  testWidgets('mostra os itens de "Todos" com protocolo, setor e status', (
    tester,
  ) async {
    stub(
      TicketFilter.all,
      1,
      buildPage([
        buildTicket(1, status: TicketStatus.inProgress, sector: 'Manutenção'),
      ]),
    );
    await pumpPage(tester);

    expect(find.text('#SIN-1001'), findsOneWidget);
    expect(find.text('Problema número 1'), findsOneWidget);
    expect(find.text('Manutenção'), findsOneWidget);
    expect(find.text(AppStrings.statusInProgress), findsOneWidget);
    // Só a aba aberta carregou.
    verifyNever(
      () => repository.getMyTickets(
        filter: TicketFilter.open,
        page: any(named: 'page'),
      ),
    );
  });

  testWidgets('cada aba mostra seu vazio e só carrega uma vez', (tester) async {
    for (final filter in TicketFilter.values) {
      stub(filter, 1, buildPage(const []));
    }
    await pumpPage(tester);
    expect(find.text(AppStrings.ticketsEmptyAll), findsOneWidget);

    await tester.tap(find.text(AppStrings.ticketsTabResolved));
    await tester.pumpAndSettle();
    expect(find.text(AppStrings.ticketsEmptyResolved), findsOneWidget);

    await tester.tap(find.text(AppStrings.ticketsTabAll));
    await tester.pumpAndSettle();
    await tester.tap(find.text(AppStrings.ticketsTabResolved));
    await tester.pumpAndSettle();

    verify(
      () => repository.getMyTickets(filter: TicketFilter.all, page: 1),
    ).called(1);
    verify(
      () => repository.getMyTickets(filter: TicketFilter.resolved, page: 1),
    ).called(1);
  });

  testWidgets('erro com "Tentar novamente"', (tester) async {
    stub(TicketFilter.all, 1, const NetworkFailure());
    await pumpPage(tester);
    expect(find.text(AppStrings.errorNetwork), findsOneWidget);

    stub(TicketFilter.all, 1, buildPage([buildTicket(1)]));
    await tester.tap(find.text(AppStrings.retry));
    await tester.pumpAndSettle();
    expect(find.text('#SIN-1001'), findsOneWidget);
  });

  testWidgets('rolar até o fim carrega a próxima página; erro no rodapé', (
    tester,
  ) async {
    stub(
      TicketFilter.all,
      1,
      buildPage([for (var i = 1; i <= 20; i++) buildTicket(i)], total: 22),
    );
    stub(TicketFilter.all, 2, const NetworkFailure());
    await pumpPage(tester);

    await tester.dragUntilVisible(
      find.text(AppStrings.ticketsLoadMoreFailed),
      find.byType(ListView),
      const Offset(0, -500),
    );
    expect(find.text('#SIN-1020'), findsOneWidget);

    stub(
      TicketFilter.all,
      2,
      buildPage([buildTicket(21), buildTicket(22)], page: 2, total: 22),
    );
    await tester.tap(find.text(AppStrings.retry));
    await tester.pumpAndSettle();
    await tester.dragUntilVisible(
      find.text('#SIN-1022'),
      find.byType(ListView),
      const Offset(0, -300),
    );
    expect(find.text(AppStrings.ticketsLoadMoreFailed), findsNothing);
  });

  testWidgets('toque no item abre o detalhe e recarrega ao voltar', (
    tester,
  ) async {
    stub(TicketFilter.all, 1, buildPage([buildTicket(7)]));
    await pumpPage(tester);

    await tester.tap(find.text('#SIN-1007'));
    await tester.pumpAndSettle();
    final detail = tester.widget<TicketDetailPage>(
      find.byType(TicketDetailPage),
    );
    expect(detail.ticketId, 'ticket-7');

    await tester.pageBack();
    await tester.pumpAndSettle();
    verify(
      () => repository.getMyTickets(filter: TicketFilter.all, page: 1),
    ).called(2);
  });

  testWidgets('"Novo relato" abre a A.3', (tester) async {
    stub(TicketFilter.all, 1, buildPage(const []));
    await pumpPage(tester);

    await tester.tap(
      find.widgetWithText(FloatingActionButton, AppStrings.newReportTitle),
    );
    await tester.pumpAndSettle();
    expect(
      find.widgetWithText(AppBar, AppStrings.newReportTitle),
      findsOneWidget,
    );
  });
}
