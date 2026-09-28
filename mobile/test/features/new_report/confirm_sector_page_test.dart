import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/src/core/l10n/app_strings.dart';
import 'package:mobile/src/core/router/app_router_enum.dart';
import 'package:mobile/src/core/router/router.dart';
import 'package:mobile/src/core/styles/app_theme.dart';
import 'package:mobile/src/features/new_report/data/services/photo_picker.dart';
import 'package:mobile/src/features/new_report/data/services/photo_processor.dart';
import 'package:mobile/src/features/new_report/domain/repositories/classification_repository.dart';
import 'package:mobile/src/features/new_report/presentation/pages/confirm_sector_page.dart';
import 'package:mobile/src/features/new_report/presentation/pages/new_report_page.dart';
import 'package:mobile/src/features/new_report/presentation/pages/ticket_sent_page.dart';
import 'package:mobile/src/features/reference_data/domain/repositories/reference_data_repositories.dart';
import 'package:mobile/src/features/tickets/domain/entities/new_ticket_request.dart';
import 'package:mobile/src/features/tickets/domain/repositories/tickets_repository.dart';
import 'package:mobile/src/shared/domain/entities/classification_result.dart';
import 'package:mocktail/mocktail.dart';

import '../../helpers/mocks.dart';
import 'confirm_sector_cubit_test.dart'
    show createdFor, limpeza, manutencao, ti;

void main() {
  late MockLocationsRepository locations;
  late MockSectorsRepository sectors;
  late MockClassificationRepository classification;
  late MockTicketsRepository tickets;
  late FakePhotoProcessor processor;
  final sent = <NewTicketRequest>[];

  setUpAll(() {
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
  });

  setUp(() {
    sent.clear();
    locations = MockLocationsRepository();
    sectors = MockSectorsRepository();
    classification = MockClassificationRepository();
    tickets = MockTicketsRepository();
    processor = FakePhotoProcessor();
    when(
      () => locations.getBuildings(forceRefresh: any(named: 'forceRefresh')),
    ).thenAnswer((_) async => [bloco]);
    when(
      () => sectors.getSectors(forceRefresh: any(named: 'forceRefresh')),
    ).thenAnswer((_) async => [limpeza, manutencao, ti]);
    when(
      () => classification.preview(any()),
    ).thenAnswer((_) async => const ClassificationResult(automaticSector: ti));
    when(
      () => tickets.createTicket(any(), onProgress: any(named: 'onProgress')),
    ).thenAnswer((invocation) async {
      final request = invocation.positionalArguments.first as NewTicketRequest;
      sent.add(request);
      return createdFor(request);
    });
  });

  /// Home -> A.3 (preenchida) -> A.4.
  Future<void> openConfirm(WidgetTester tester) async {
    tester.view
      ..physicalSize = const Size(800, 2000)
      ..devicePixelRatio = 1;
    addTearDown(tester.view.reset);

    await tester.pumpWidget(
      MultiRepositoryProvider(
        providers: [
          RepositoryProvider<LocationsRepository>.value(value: locations),
          RepositoryProvider<SectorsRepository>.value(value: sectors),
          RepositoryProvider<ClassificationRepository>.value(
            value: classification,
          ),
          RepositoryProvider<TicketsRepository>.value(value: tickets),
          RepositoryProvider<PhotoPicker>.value(value: FakePhotoPicker()),
          RepositoryProvider<PhotoProcessor>.value(value: processor),
        ],
        child: MaterialApp(
          theme: appTheme,
          onGenerateRoute: AppRouter.generateRoute,
          home: Builder(
            builder: (context) => Scaffold(
              body: TextButton(
                onPressed: () => Navigator.of(
                  context,
                ).pushNamed(AppRouterEnum.newReport.route),
                child: const Text('home'),
              ),
            ),
          ),
        ),
      ),
    );
    await tester.tap(find.text('home'));
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
    await tester.tap(
      find.widgetWithText(FilledButton, AppStrings.reportContinue),
    );
    await tester.pumpAndSettle();
    expect(find.byType(ConfirmSectorPage), findsOneWidget);
  }

  Finder submitButton() =>
      find.widgetWithText(FilledButton, AppStrings.confirmSubmit);

  testWidgets('mostra a sugestão e "Enviar para" pré-preenchido', (
    tester,
  ) async {
    await openConfirm(tester);

    expect(find.text(AppStrings.confirmSuggestionIntro), findsOneWidget);
    expect(find.text('TI'), findsNWidgets(2)); // cartão + seletor
    expect(find.text(AppStrings.confirmSectorChanged), findsNothing);
    expect(find.text('O projetor não liga'), findsOneWidget);
    expect(find.text('Bloco A · Sala 101'), findsOneWidget);
    expect(find.text(AppStrings.confirmPhotos(0)), findsOneWidget);
  });

  testWidgets('trocar o setor mostra aviso e envia os dois setores', (
    tester,
  ) async {
    await openConfirm(tester);

    await tester.tap(find.text(AppStrings.confirmSendTo));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Manutenção Predial').last);
    await tester.pumpAndSettle();
    expect(find.text(AppStrings.confirmSectorChanged), findsOneWidget);

    await tester.tap(submitButton());
    await tester.pumpAndSettle();

    expect(sent.single.automaticSectorId, ti.id);
    expect(sent.single.confirmedSectorId, manutencao.id);
  });

  testWidgets('enviar abre a A.5 e voltar não retorna ao fluxo', (
    tester,
  ) async {
    await openConfirm(tester);
    await tester.tap(submitButton());
    await tester.pumpAndSettle();

    expect(find.byType(TicketSentPage), findsOneWidget);
    expect(find.text('#SIN-1050'), findsOneWidget);

    await tester.binding.handlePopRoute(); // voltar do Android
    await tester.pumpAndSettle();
    expect(find.text('home'), findsOneWidget);
    expect(find.byType(NewReportPage), findsNothing);
    expect(find.byType(ConfirmSectorPage), findsNothing);
  });

  testWidgets('durante o envio: botão em loading e voltar bloqueado', (
    tester,
  ) async {
    final gate = Completer<void>();
    when(
      () => tickets.createTicket(any(), onProgress: any(named: 'onProgress')),
    ).thenAnswer((invocation) async {
      await gate.future;
      return createdFor(
        invocation.positionalArguments.first as NewTicketRequest,
      );
    });
    await openConfirm(tester);

    await tester.tap(submitButton());
    await tester.pump();
    expect(find.byType(CircularProgressIndicator), findsOneWidget);

    // Tentativas de voltar e de tocar de novo são ignoradas.
    await tester.binding.handlePopRoute();
    await tester.pump();
    expect(find.byType(ConfirmSectorPage), findsOneWidget);
    await tester.tap(find.byType(FilledButton), warnIfMissed: false);

    gate.complete();
    await tester.pumpAndSettle();
    verify(
      () => tickets.createTicket(any(), onProgress: any(named: 'onProgress')),
    ).called(1);
    expect(find.byType(TicketSentPage), findsOneWidget);
  });

  testWidgets('"Editar" volta para a A.3 com tudo preenchido', (tester) async {
    await openConfirm(tester);
    await tester.tap(find.text(AppStrings.confirmEdit));
    await tester.pumpAndSettle();

    expect(find.byType(NewReportPage), findsOneWidget);
    expect(find.text('O projetor não liga'), findsOneWidget);
  });
}
