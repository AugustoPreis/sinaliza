// Testes de ponta a ponta contra a API local (api/ com docker-compose + seed).
//
// Rodar num emulador/aparelho, na pasta mobile/:
//
//   flutter test integration_test \
//     --dart-define-from-file=env/dev.json \
//     --dart-define=TEST_IDENTIFIER=<matrícula ou e-mail de um solicitante> \
//     --dart-define=TEST_PASSWORD=<senha>
//
// Cria chamados de verdade no banco local (sem fotos: o seletor é do sistema).
// ignore_for_file: avoid_print

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:intl/intl.dart';
import 'package:mobile/src/app.dart';
import 'package:mobile/src/core/config/env.dart';
import 'package:mobile/src/core/l10n/app_strings.dart';
import 'package:mobile/src/core/network/api_client.dart';
import 'package:mobile/src/core/utils/injections.dart';
import 'package:mobile/src/features/auth/presentation/cubit/session_cubit.dart';
import 'package:mobile/src/features/auth/presentation/pages/login_page.dart';
import 'package:mobile/src/features/home/presentation/pages/home_page.dart';
import 'package:mobile/src/features/new_report/presentation/pages/confirm_sector_page.dart';
import 'package:mobile/src/features/new_report/presentation/pages/ticket_sent_page.dart';
import 'package:mobile/src/features/push/application/push_coordinator.dart';
import 'package:mobile/src/features/tickets/presentation/pages/ticket_detail_page.dart';

const _identifier = String.fromEnvironment('TEST_IDENTIFIER');
const _password = String.fromEnvironment('TEST_PASSWORD');

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  setUpAll(() async {
    Env.validate();
    if (_identifier.isEmpty || _password.isEmpty) {
      fail('Informe --dart-define=TEST_IDENTIFIER=... e TEST_PASSWORD=...');
    }
    Intl.defaultLocale = 'pt_BR';
    await initializeDateFormatting('pt_BR');
    await initInjections();
    final session = sl<SessionCubit>();
    await sl<PushCoordinator>().start(
      sessionChanges: session.stream,
      currentSession: session.state,
    );
  });

  /// Começa sempre deslogado.
  Future<void> openApp(WidgetTester tester) async {
    await sl<ApiClient>().clearSession();
    await tester.pumpWidget(MyApp());
    await pumpUntilFound(tester, find.byType(LoginPage));
  }

  Future<void> login(WidgetTester tester) async {
    await tester.enterText(
      find.widgetWithText(TextFormField, AppStrings.loginIdentifierLabel),
      _identifier,
    );
    await tester.enterText(
      find.widgetWithText(TextFormField, AppStrings.loginPasswordLabel),
      _password,
    );
    await tester.tap(find.widgetWithText(FilledButton, AppStrings.loginSubmit));
    await pumpUntilFound(tester, find.byType(HomePage));
    await dismissPushRationale(tester);
  }

  /// A.3 -> A.4: descrição + primeiro prédio/ambiente -> classificar.
  Future<void> fillNewReport(WidgetTester tester, String description) async {
    await tester.tap(find.byType(FloatingActionButton));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField).first, description);

    for (final field in [
      AppStrings.reportBuildingLabel,
      AppStrings.reportEnvironmentLabel,
    ]) {
      await pumpUntilFound(tester, find.text(field));
      await tester.tap(find.text(field).last);
      await tester.pumpAndSettle();
      // Primeira opção do bottom sheet.
      await tester.tap(find.byType(ListTile).first);
      await tester.pumpAndSettle();
    }

    final continueButton = find.widgetWithText(
      FilledButton,
      AppStrings.reportContinue,
    );
    await tester.ensureVisible(continueButton);
    await tester.pumpAndSettle();
    await tester.tap(continueButton);
    await pumpUntilFound(tester, find.byType(ConfirmSectorPage));
  }

  Future<String> submitAndOpenDetail(WidgetTester tester) async {
    final submit = find.widgetWithText(FilledButton, AppStrings.confirmSubmit);
    await tester.ensureVisible(submit);
    await tester.pumpAndSettle();
    await tester.tap(submit);
    await pumpUntilFound(tester, find.byType(TicketSentPage));

    final sent = tester.widget<TicketSentPage>(find.byType(TicketSentPage));
    final protocol = sent.ticket.protocol;
    print('Chamado criado: $protocol (${sent.ticket.currentSector.name})');

    await tester.tap(find.text(AppStrings.ticketSentViewTicket));
    await pumpUntilFound(tester, find.byType(TicketDetailPage));
    await pumpUntilFound(tester, find.text('#$protocol'));
    return protocol;
  }

  testWidgets('20.1: login -> relato -> classificação -> confirmar -> '
      'enviado -> detalhe', (tester) async {
    await openApp(tester);
    await login(tester);
    await fillNewReport(tester, 'O projetor da sala não liga (teste e2e).');

    final sent = await submitAndOpenDetail(tester);

    expect(
      find.textContaining('Solicitante confirmou o setor'),
      findsOneWidget,
    );
    expect(sent, startsWith('SIN-'));
  });

  testWidgets('troca de setor registra a alteração', (tester) async {
    await openApp(tester);
    await login(tester);
    await fillNewReport(tester, 'Vazamento na pia do banheiro (teste e2e).');

    // Escolhe em "Enviar para" um setor diferente do sugerido.
    await tester.tap(find.text(AppStrings.confirmSendTo));
    await tester.pumpAndSettle();
    // A opção marcada é a sugestão; toca na primeira outra.
    final options = find.byType(ListTile);
    final other = List.generate(
      options.evaluate().length,
      options.at,
    ).firstWhere((option) => !tester.widget<ListTile>(option).selected);
    await tester.tap(other);
    await tester.pumpAndSettle();
    expect(find.text(AppStrings.confirmSectorChanged), findsOneWidget);

    await submitAndOpenDetail(tester);

    expect(
      find.textContaining('Solicitante alterou o setor sugerido'),
      findsOneWidget,
    );
  });

  testWidgets('logout volta ao login e reabrir continua deslogado', (
    tester,
  ) async {
    await openApp(tester);
    await login(tester);

    await tester.tap(
      find.descendant(
        of: find.byType(NavigationBar),
        matching: find.text(AppStrings.tabProfile),
      ),
    );
    await tester.pumpAndSettle();
    final logout = find.text(AppStrings.logout);
    await tester.ensureVisible(logout);
    await tester.pumpAndSettle();
    await tester.tap(logout);
    await tester.pumpAndSettle();
    await tester.tap(
      find.descendant(
        of: find.byType(AlertDialog),
        matching: find.text(AppStrings.logout),
      ),
    );
    await pumpUntilFound(tester, find.byType(LoginPage));

    expect(await sl<ApiClient>().hasSession(), isFalse);

    // "Reabrir" o app: sem sessão, o splash leva ao login.
    await tester.pumpWidget(const SizedBox.shrink());
    await tester.pumpWidget(MyApp());
    await pumpUntilFound(tester, find.byType(LoginPage));
  });
}

/// Espera [finder] aparecer (chamadas reais à API levam tempo).
Future<void> pumpUntilFound(
  WidgetTester tester,
  Finder finder, {
  Duration timeout = const Duration(seconds: 30),
}) async {
  final end = DateTime.now().add(timeout);
  while (DateTime.now().isBefore(end)) {
    await tester.pump(const Duration(milliseconds: 200));
    if (finder.evaluate().isNotEmpty) {
      await tester.pumpAndSettle();
      return;
    }
  }
  fail('Tempo esgotado esperando: $finder');
}

/// Com o Firebase configurado, o app explica o push após o login.
Future<void> dismissPushRationale(WidgetTester tester) async {
  await tester.pump(const Duration(milliseconds: 500));
  final decline = find.text(AppStrings.pushRationaleDecline);
  if (decline.evaluate().isNotEmpty) {
    await tester.tap(decline);
    await tester.pumpAndSettle();
  }
}
