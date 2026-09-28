import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/src/features/auth/domain/repositories/auth_repository.dart';
import 'package:mobile/src/features/notifications/domain/notifications_refresh_signal.dart';
import 'package:mobile/src/features/notifications/domain/repositories/notifications_repository.dart';
import 'package:mobile/src/features/tickets/domain/repositories/tickets_repository.dart';
import 'package:mobile/src/app.dart';
import 'package:mobile/src/core/config/app_version.dart';
import 'package:mobile/src/core/errors/app_failure.dart';
import 'package:mobile/src/core/l10n/app_strings.dart';
import 'package:mobile/src/core/network/session_events.dart';
import 'package:mobile/src/core/router/app_navigator.dart';
import 'package:mobile/src/features/auth/presentation/cubit/session_cubit.dart';
import 'package:mobile/src/features/auth/presentation/pages/login_page.dart';
import 'package:mobile/src/features/home/presentation/pages/home_page.dart';
import 'package:mocktail/mocktail.dart';

import '../../helpers/mocks.dart';
import '../../helpers/test_data.dart';
import 'session_cubit_test.dart' show MockAuthRepository;

void main() {
  late MockAuthRepository repository;
  late SessionEventBus events;
  late SessionCubit session;

  late MockTicketsRepository tickets;

  setUpAll(registerMockFallbacks);

  setUp(() {
    tickets = MockTicketsRepository();
    stubEmptyTickets(tickets);
    repository = MockAuthRepository();
    events = SessionEventBus();
    session = SessionCubit(repository: repository, sessionEvents: events);
    when(() => repository.hasSession()).thenAnswer((_) async => false);
  });

  tearDown(() async {
    await session.close();
    await events.dispose();
  });

  Future<void> openLogin(WidgetTester tester) async {
    await tester.pumpWidget(
      MyApp(
        sessionCubit: session,
        repositories: [
          RepositoryProvider<AuthRepository>.value(value: repository),
          RepositoryProvider<TicketsRepository>.value(value: tickets),
          RepositoryProvider<NotificationsRepository>.value(
            value: emptyNotificationsRepository(),
          ),
          RepositoryProvider<NotificationsRefreshSignal>.value(
            value: NotificationsRefreshSignal(),
          ),
          RepositoryProvider<AppVersionProvider>.value(value: FakeAppVersion()),
        ],
        navigator: AppNavigator(),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.byType(LoginPage), findsOneWidget);
  }

  Finder field(String label) => find.widgetWithText(TextFormField, label).first;

  testWidgets('sem link de criar conta', (tester) async {
    await openLogin(tester);
    expect(find.textContaining('Criar conta'), findsNothing);
    expect(find.textContaining('Cadastr'), findsNothing);
  });

  testWidgets('login com matrícula pelo "done" do teclado vai para a home', (
    tester,
  ) async {
    when(
      () => repository.login(identifier: '2023001234', password: 'secret'),
    ).thenAnswer((_) async => requester);
    await openLogin(tester);

    await tester.enterText(
      field(AppStrings.loginIdentifierLabel),
      '2023001234',
    );
    await tester.enterText(field(AppStrings.loginPasswordLabel), 'secret');
    await tester.testTextInput.receiveAction(TextInputAction.done);
    await tester.pumpAndSettle();

    expect(find.byType(HomePage), findsOneWidget);
    expect(find.byType(LoginPage), findsNothing);
  });

  testWidgets('login com e-mail pelo botão', (tester) async {
    when(
      () => repository.login(
        identifier: 'maria@instituicao.edu.br',
        password: 'secret',
      ),
    ).thenAnswer((_) async => requester);
    await openLogin(tester);

    await tester.enterText(
      field(AppStrings.loginIdentifierLabel),
      'maria@instituicao.edu.br',
    );
    await tester.enterText(field(AppStrings.loginPasswordLabel), 'secret');
    await tester.tap(find.widgetWithText(FilledButton, AppStrings.loginSubmit));
    await tester.pumpAndSettle();

    expect(find.byType(HomePage), findsOneWidget);
  });

  testWidgets('credenciais inválidas mostram erro e ficam no login', (
    tester,
  ) async {
    when(
      () => repository.login(
        identifier: any(named: 'identifier'),
        password: any(named: 'password'),
      ),
    ).thenThrow(const UnauthorizedFailure());
    await openLogin(tester);

    await tester.enterText(field(AppStrings.loginIdentifierLabel), 'maria');
    await tester.enterText(field(AppStrings.loginPasswordLabel), 'errada');
    await tester.tap(find.widgetWithText(FilledButton, AppStrings.loginSubmit));
    await tester.pumpAndSettle();

    expect(find.text(AppStrings.loginInvalidCredentials), findsOneWidget);
    expect(find.byType(LoginPage), findsOneWidget);
  });

  testWidgets('campos vazios mostram erro por campo', (tester) async {
    await openLogin(tester);
    await tester.tap(find.widgetWithText(FilledButton, AppStrings.loginSubmit));
    await tester.pump();

    expect(find.text(AppStrings.loginIdentifierRequired), findsOneWidget);
    expect(find.text(AppStrings.loginPasswordRequired), findsOneWidget);
  });

  group('esqueci minha senha', () {
    testWidgets('matrícula digitada no login não é reaproveitada', (
      tester,
    ) async {
      await openLogin(tester);
      await tester.enterText(
        field(AppStrings.loginIdentifierLabel),
        '2023001234',
      );
      await tester.tap(find.text(AppStrings.forgotPassword));
      await tester.pumpAndSettle();

      final email = tester.widget<TextField>(
        find.descendant(
          of: find.widgetWithText(
            TextFormField,
            AppStrings.forgotPasswordEmailLabel,
          ),
          matching: find.byType(TextField),
        ),
      );
      expect(email.controller?.text, isEmpty);
    });

    testWidgets('envia o e-mail e mostra a confirmação neutra', (tester) async {
      when(
        () => repository.forgotPassword('maria@instituicao.edu.br'),
      ).thenAnswer((_) async {});
      await openLogin(tester);
      await tester.enterText(
        field(AppStrings.loginIdentifierLabel),
        'maria@instituicao.edu.br',
      );
      await tester.tap(find.text(AppStrings.forgotPassword));
      await tester.pumpAndSettle();

      // E-mail do login reaproveitado.
      expect(find.text('maria@instituicao.edu.br'), findsWidgets);
      await tester.tap(
        find.widgetWithText(FilledButton, AppStrings.forgotPasswordSubmit),
      );
      await tester.pumpAndSettle();

      expect(find.text(AppStrings.forgotPasswordSent), findsOneWidget);
      await tester.tap(find.widgetWithText(FilledButton, AppStrings.close));
      await tester.pumpAndSettle();
      expect(find.text(AppStrings.forgotPasswordSent), findsNothing);
      expect(find.byType(LoginPage), findsOneWidget);
    });
  });
}
