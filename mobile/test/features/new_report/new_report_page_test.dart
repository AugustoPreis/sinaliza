import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/src/core/errors/app_failure.dart';
import 'package:mobile/src/core/l10n/app_strings.dart';
import 'package:mobile/src/core/router/app_router_enum.dart';
import 'package:mobile/src/core/router/router.dart';
import 'package:mobile/src/core/styles/app_theme.dart';
import 'package:mobile/src/features/new_report/data/services/photo_picker.dart';
import 'package:mobile/src/features/new_report/data/services/photo_processor.dart';
import 'package:mobile/src/features/new_report/domain/repositories/classification_repository.dart';
import 'package:mobile/src/features/new_report/presentation/pages/confirm_sector_page.dart';
import 'package:mobile/src/features/new_report/presentation/pages/new_report_page.dart';
import 'package:mobile/src/features/reference_data/domain/repositories/reference_data_repositories.dart';
import 'package:mobile/src/features/tickets/domain/repositories/tickets_repository.dart';
import 'package:mobile/src/shared/domain/entities/classification_result.dart';
import 'package:mobile/src/shared/domain/entities/refs.dart';
import 'package:mocktail/mocktail.dart';

import '../../helpers/mocks.dart';

void main() {
  late MockLocationsRepository locations;
  late MockClassificationRepository classification;
  late FakePhotoPicker picker;
  late FakePhotoProcessor processor;
  late MockSectorsRepository sectors;

  setUp(() {
    locations = MockLocationsRepository();
    classification = MockClassificationRepository();
    picker = FakePhotoPicker();
    processor = FakePhotoProcessor();
    sectors = MockSectorsRepository();
    when(
      () => sectors.getSectors(forceRefresh: any(named: 'forceRefresh')),
    ).thenAnswer(
      (_) async => const [SectorRef(id: 's1', name: 'Manutenção Predial')],
    );
    when(
      () => locations.getBuildings(forceRefresh: any(named: 'forceRefresh')),
    ).thenAnswer((_) async => [bloco, biblioteca, semAmbientes]);
    when(() => classification.preview(any())).thenAnswer(
      (_) async => const ClassificationResult(
        automaticSector: SectorRef(id: 's1', name: 'Manutenção Predial'),
      ),
    );
  });

  /// Home falsa com um botão que abre a A.3 (para testar o voltar).
  Future<void> openNewReport(WidgetTester tester) async {
    // Tela alta: o formulário inteiro cabe sem rolar (o ListView é lazy).
    tester.view
      ..physicalSize = const Size(800, 2000)
      ..devicePixelRatio = 1;
    addTearDown(tester.view.reset);
    await tester.pumpWidget(
      MultiRepositoryProvider(
        providers: [
          RepositoryProvider<LocationsRepository>.value(value: locations),
          RepositoryProvider<ClassificationRepository>.value(
            value: classification,
          ),
          RepositoryProvider<PhotoPicker>.value(value: picker),
          RepositoryProvider<PhotoProcessor>.value(value: processor),
          // Usados pela A.4 real.
          RepositoryProvider<SectorsRepository>.value(value: sectors),
          RepositoryProvider<TicketsRepository>.value(
            value: MockTicketsRepository(),
          ),
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
                child: const Text('abrir'),
              ),
            ),
          ),
        ),
      ),
    );
    await tester.tap(find.text('abrir'));
    await tester.pumpAndSettle();
    expect(find.byType(NewReportPage), findsOneWidget);
  }

  Finder continueButton() =>
      find.widgetWithText(FilledButton, AppStrings.reportContinue);

  bool continueEnabled(WidgetTester tester) =>
      tester.widget<FilledButton>(continueButton()).onPressed != null;

  Future<void> choose(WidgetTester tester, String field, String option) async {
    await tester.tap(find.text(field).last);
    await tester.pumpAndSettle();
    await tester.tap(find.text(option).last);
    await tester.pumpAndSettle();
  }

  Future<void> fillValid(WidgetTester tester) async {
    await tester.enterText(
      find.byType(TextField).first,
      'O projetor da sala 101 não liga',
    );
    await choose(tester, AppStrings.reportBuildingLabel, 'Bloco A');
    await choose(tester, AppStrings.reportEnvironmentLabel, 'Sala 101');
  }

  testWidgets('sem descrição ou sem local, "Continuar" fica desabilitado', (
    tester,
  ) async {
    await openNewReport(tester);
    expect(continueEnabled(tester), isFalse);

    await tester.enterText(find.byType(TextField).first, 'Vazamento');
    await tester.pump();
    expect(continueEnabled(tester), isFalse);

    await choose(tester, AppStrings.reportBuildingLabel, 'Bloco A');
    expect(continueEnabled(tester), isFalse);

    await choose(tester, AppStrings.reportEnvironmentLabel, 'Corredor');
    expect(continueEnabled(tester), isTrue);
  });

  testWidgets('ambiente fica bloqueado até escolher o prédio', (tester) async {
    await openNewReport(tester);
    expect(find.text(AppStrings.reportChooseBuildingFirst), findsOneWidget);

    await tester.tap(find.text(AppStrings.reportEnvironmentLabel));
    await tester.pumpAndSettle();
    expect(find.text('Sala 101'), findsNothing);
  });

  testWidgets('trocar o prédio limpa o ambiente', (tester) async {
    await openNewReport(tester);
    await fillValid(tester);
    expect(find.text('Sala 101'), findsOneWidget);

    await choose(tester, AppStrings.reportBuildingLabel, 'Biblioteca');
    expect(find.text('Sala 101'), findsNothing);
    expect(continueEnabled(tester), isFalse);
  });

  testWidgets('prédio sem ambientes mostra aviso', (tester) async {
    await openNewReport(tester);
    await choose(tester, AppStrings.reportBuildingLabel, 'Anexo');
    expect(
      find.text(AppStrings.reportBuildingWithoutEnvironments),
      findsOneWidget,
    );
  });

  testWidgets('continuar classifica só com a descrição e abre a A.4; voltar '
      'mantém tudo preenchido', (tester) async {
    await openNewReport(tester);
    await fillValid(tester);
    picker.cameraResult = '/camera/1.jpg';
    await tester.tap(find.text(AppStrings.reportAddFromCamera));
    await tester.pumpAndSettle();

    await tester.ensureVisible(continueButton());
    await tester.tap(continueButton());
    await tester.pumpAndSettle();

    verify(
      () => classification.preview('O projetor da sala 101 não liga'),
    ).called(1);
    expect(find.byType(ConfirmSectorPage), findsOneWidget);
    expect(find.text('Manutenção Predial'), findsWidgets);

    await tester.pageBack();
    await tester.pumpAndSettle();
    expect(find.byType(NewReportPage), findsOneWidget);
    expect(find.text('O projetor da sala 101 não liga'), findsOneWidget);
    expect(find.text('Bloco A'), findsOneWidget);
    expect(find.text('Sala 101'), findsOneWidget);
    expect(find.text(AppStrings.reportPhotosCount(1, 5)), findsOneWidget);
    expect(processor.discarded, isEmpty); // fotos continuam no fluxo
  });

  testWidgets('erro na classificação mostra mensagem e "Tentar novamente"', (
    tester,
  ) async {
    when(() => classification.preview(any())).thenThrow(const NetworkFailure());
    await openNewReport(tester);
    await fillValid(tester);

    await tester.ensureVisible(continueButton());
    await tester.tap(continueButton());
    await tester.pumpAndSettle();

    expect(find.text(AppStrings.errorNetwork), findsOneWidget);
    expect(find.widgetWithText(FilledButton, AppStrings.retry), findsOneWidget);
    expect(find.text('O projetor da sala 101 não liga'), findsOneWidget);
    expect(find.byType(ConfirmSectorPage), findsNothing);
  });

  group('descartar', () {
    testWidgets('sem dados sai direto', (tester) async {
      await openNewReport(tester);
      await tester.pageBack();
      await tester.pumpAndSettle();
      expect(find.byType(NewReportPage), findsNothing);
    });

    testWidgets('com dados pergunta "Descartar relato?"', (tester) async {
      await openNewReport(tester);
      await tester.enterText(find.byType(TextField).first, 'Vazamento');
      await tester.pump();

      await tester.pageBack();
      await tester.pumpAndSettle();
      expect(find.text(AppStrings.reportDiscardTitle), findsOneWidget);

      await tester.tap(find.text(AppStrings.reportKeepEditing));
      await tester.pumpAndSettle();
      expect(find.byType(NewReportPage), findsOneWidget);

      await tester.pageBack();
      await tester.pumpAndSettle();
      await tester.tap(find.text(AppStrings.reportDiscard));
      await tester.pumpAndSettle();
      expect(find.byType(NewReportPage), findsNothing);
    });
  });

  testWidgets('permissão negada oferece abrir os ajustes', (tester) async {
    picker.error = const PhotoPermissionDenied(PhotoSource.gallery);
    await openNewReport(tester);

    await tester.ensureVisible(find.text(AppStrings.reportAddFromGallery));
    await tester.tap(find.text(AppStrings.reportAddFromGallery));
    await tester.pumpAndSettle();

    expect(find.text(AppStrings.reportGalleryPermissionDenied), findsOneWidget);
    expect(find.text(AppStrings.openSettings), findsOneWidget);
    await tester.tap(find.text(AppStrings.cancel));
    await tester.pumpAndSettle();
  });

  testWidgets('locais indisponíveis mostram erro com retry', (tester) async {
    when(
      () => locations.getBuildings(forceRefresh: any(named: 'forceRefresh')),
    ).thenThrow(const ConfigurationFailure(AppStrings.noLocationsConfigured));
    await openNewReport(tester);

    expect(find.text(AppStrings.noLocationsConfigured), findsOneWidget);
    when(
      () => locations.getBuildings(forceRefresh: true),
    ).thenAnswer((_) async => [bloco]);
    await tester.tap(find.text(AppStrings.retry));
    await tester.pumpAndSettle();
    expect(find.text(AppStrings.reportBuildingLabel), findsOneWidget);
  });
}
