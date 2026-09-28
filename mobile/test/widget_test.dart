import 'dart:async';

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
import 'package:mobile/src/features/auth/presentation/pages/splash_page.dart';
import 'package:mobile/src/features/home/presentation/pages/home_page.dart';
import 'package:mocktail/mocktail.dart';

import 'features/auth/session_cubit_test.dart' show MockAuthRepository;
import 'helpers/mocks.dart';
import 'helpers/test_data.dart';

void main() {
  late MockAuthRepository repository;
  late SessionEventBus events;
  late SessionCubit cubit;

  late MockTicketsRepository tickets;

  setUpAll(registerMockFallbacks);

  setUp(() {
    tickets = MockTicketsRepository();
    stubEmptyTickets(tickets);
    repository = MockAuthRepository();
    events = SessionEventBus();
    cubit = SessionCubit(repository: repository, sessionEvents: events);
    when(() => repository.hasSession()).thenAnswer((_) async => true);
    when(() => repository.clearSession()).thenAnswer((_) async {});
    when(() => repository.logout()).thenAnswer((_) async {});
  });

  tearDown(() async {
    await cubit.close();
    await events.dispose();
  });

  Future<void> pumpApp(
    WidgetTester tester, {
    NotificationsRepository? notifications,
  }) async {
    await tester.pumpWidget(
      MyApp(
        sessionCubit: cubit,
        repositories: [
          RepositoryProvider<AuthRepository>.value(value: repository),
          RepositoryProvider<TicketsRepository>.value(value: tickets),
          RepositoryProvider<NotificationsRepository>.value(
            value: notifications ?? emptyNotificationsRepository(),
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
  }

  testWidgets('app aberto com nome Sinaliza, em pt-BR', (tester) async {
    when(() => repository.hasSession()).thenAnswer((_) async => false);
    await pumpApp(tester);

    final app = tester.widget<MaterialApp>(find.byType(MaterialApp));
    expect(app.title, AppStrings.appName);
    expect(app.locale, const Locale('pt', 'BR'));
  });

  testWidgets('sem sessão -> login', (tester) async {
    when(() => repository.hasSession()).thenAnswer((_) async => false);
    await pumpApp(tester);

    expect(find.byType(LoginPage), findsOneWidget);
    expect(find.byType(SplashPage), findsNothing);
  });

  testWidgets('sessão válida -> "Meus chamados" sem passar pelo login', (
    tester,
  ) async {
    final me = Completer<void>();
    when(() => repository.me()).thenAnswer((_) async {
      await me.future;
      return requester;
    });

    await tester.pumpWidget(
      MyApp(
        sessionCubit: cubit,
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
    await tester.pump();
    // Enquanto verifica: splash, nunca login.
    expect(find.byType(SplashPage), findsOneWidget);
    expect(find.byType(LoginPage), findsNothing);

    me.complete();
    await tester.pumpAndSettle();

    expect(find.byType(HomePage), findsOneWidget);
    expect(find.text(AppStrings.myTicketsTitle), findsOneWidget);
    expect(find.byType(LoginPage), findsNothing);
  });

  testWidgets('bolinha de não lidas na aba e zera ao abrir Notificações', (
    tester,
  ) async {
    when(() => repository.me()).thenAnswer((_) async => requester);
    final notifications = emptyNotificationsRepository(unread: 3);
    await pumpApp(tester, notifications: notifications);

    final badge = find.descendant(
      of: find.byType(NavigationBar),
      matching: find.text('3'),
    );
    expect(badge, findsOneWidget);
    verifyNever(notifications.markAllRead);

    await tester.tap(
      find.descendant(
        of: find.byType(NavigationBar),
        matching: find.text(AppStrings.tabNotifications),
      ),
    );
    await tester.pumpAndSettle();

    expect(badge, findsNothing);
    verify(notifications.markAllRead).called(1);
  });

  testWidgets('puxar a lista de chamados atualiza a bolinha', (tester) async {
    when(() => repository.me()).thenAnswer((_) async => requester);
    final notifications = emptyNotificationsRepository();
    await pumpApp(tester, notifications: notifications);
    final badge = find.descendant(
      of: find.byType(NavigationBar),
      matching: find.text('2'),
    );
    expect(badge, findsNothing);

    // Chegaram notificações enquanto a pessoa estava na lista.
    stubUnread(notifications, 2);
    await tester.fling(
      find.byType(RefreshIndicator).first,
      const Offset(0, 400),
      1000,
    );
    await tester.pumpAndSettle();

    expect(badge, findsOneWidget);
  });

  testWidgets('bolinha mostra "9+" acima de 9', (tester) async {
    when(() => repository.me()).thenAnswer((_) async => requester);
    await pumpApp(
      tester,
      notifications: emptyNotificationsRepository(unread: 12),
    );

    expect(
      find.descendant(
        of: find.byType(NavigationBar),
        matching: find.text('9+'),
      ),
      findsOneWidget,
    );
  });

  testWidgets('sem rede no splash -> erro com "Tentar novamente"', (
    tester,
  ) async {
    when(() => repository.me()).thenThrow(const NetworkFailure());
    await pumpApp(tester);

    expect(find.byType(SplashPage), findsOneWidget);
    expect(find.text(AppStrings.retry), findsOneWidget);
    expect(find.byType(LoginPage), findsNothing);

    when(() => repository.me()).thenAnswer((_) async => requester);
    await tester.tap(find.text(AppStrings.retry));
    await tester.pumpAndSettle();
    expect(find.byType(HomePage), findsOneWidget);
  });

  testWidgets('sessão expirada na home -> login com aviso', (tester) async {
    when(() => repository.me()).thenAnswer((_) async => requester);
    await pumpApp(tester);
    expect(find.byType(HomePage), findsOneWidget);

    // O bus foi criado no setUp (zona real): entrega o evento fora do fake async.
    await tester.runAsync(() async {
      events.emit(const SessionExpired());
      await Future<void>.delayed(Duration.zero);
    });
    await tester.pumpAndSettle();

    expect(find.byType(LoginPage), findsOneWidget);
    expect(find.byType(HomePage), findsNothing);
    expect(find.text(AppStrings.sessionExpired), findsOneWidget);
  });

  testWidgets('conta sem tickets:create -> tela sem acesso e "Sair"', (
    tester,
  ) async {
    when(() => repository.me()).thenAnswer((_) async => sectorStaff);
    await pumpApp(tester);

    expect(find.text(AppStrings.noAccessMessage), findsOneWidget);
    expect(find.byType(HomePage), findsNothing);

    await tester.tap(find.text(AppStrings.logout));
    await tester.pumpAndSettle();
    expect(find.byType(LoginPage), findsOneWidget);
    verify(() => repository.logout()).called(1);
  });

  testWidgets('abas preservam a home e o voltar retorna para Chamados', (
    tester,
  ) async {
    when(() => repository.me()).thenAnswer((_) async => requester);
    await pumpApp(tester);

    await tester.tap(
      find.descendant(
        of: find.byType(NavigationBar),
        matching: find.text(AppStrings.tabProfile),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text(AppStrings.profileTitle), findsWidgets);

    // Voltar do Android numa aba secundária -> Chamados (não sai da home).
    await tester.binding.handlePopRoute();
    await tester.pumpAndSettle();
    expect(find.byType(HomePage), findsOneWidget);
    final bar = tester.widget<NavigationBar>(find.byType(NavigationBar));
    expect(bar.selectedIndex, 0);
    expect(find.byType(LoginPage), findsNothing);
  });

  testWidgets('"Sair" no perfil -> login', (tester) async {
    // Tela alta: o botão "Sair" fica longe da barra de navegação.
    tester.view
      ..physicalSize = const Size(800, 1600)
      ..devicePixelRatio = 1;
    addTearDown(tester.view.reset);
    when(() => repository.me()).thenAnswer((_) async => requester);
    await pumpApp(tester);

    await tester.tap(
      find.descendant(
        of: find.byType(NavigationBar),
        matching: find.text(AppStrings.tabProfile),
      ),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text(AppStrings.logout));
    await tester.pumpAndSettle();
    // Confirmação.
    expect(find.text(AppStrings.logoutConfirmTitle), findsOneWidget);
    await tester.tap(
      find.descendant(
        of: find.byType(AlertDialog),
        matching: find.text(AppStrings.logout),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.byType(LoginPage), findsOneWidget);
    verify(() => repository.logout()).called(1);
  });
}
