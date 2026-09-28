import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/src/core/config/app_version.dart';
import 'package:mobile/src/core/errors/app_failure.dart';
import 'package:mobile/src/core/l10n/app_strings.dart';
import 'package:mobile/src/core/network/session_events.dart';
import 'package:mobile/src/core/styles/app_theme.dart';
import 'package:mobile/src/features/auth/presentation/cubit/session_cubit.dart';
import 'package:mobile/src/features/profile/presentation/pages/profile_page.dart';
import 'package:mobile/src/shared/domain/entities/user.dart';
import 'package:mocktail/mocktail.dart';

import '../../helpers/mocks.dart';
import '../../helpers/test_data.dart';
import '../auth/session_cubit_test.dart' show MockAuthRepository;

void main() {
  late MockAuthRepository repository;
  late SessionEventBus events;
  late SessionCubit session;
  late List<SessionEvent> emitted;

  setUp(() async {
    repository = MockAuthRepository();
    events = SessionEventBus();
    emitted = [];
    events.events.listen(emitted.add);
    session = SessionCubit(repository: repository, sessionEvents: events);
    when(() => repository.logout()).thenAnswer((_) async {});
    await session.loggedIn(requester);
  });

  tearDown(() async {
    await session.close();
    await events.dispose();
  });

  Future<void> pumpProfile(WidgetTester tester) async {
    await tester.pumpWidget(
      MultiRepositoryProvider(
        providers: [
          RepositoryProvider<AppVersionProvider>.value(value: FakeAppVersion()),
        ],
        child: BlocProvider.value(
          value: session,
          child: MaterialApp(theme: appTheme, home: const ProfilePage()),
        ),
      ),
    );
    await tester.pumpAndSettle();
  }

  Finder confirmButton() => find.descendant(
    of: find.byType(AlertDialog),
    matching: find.text(AppStrings.logout),
  );

  testWidgets('mostra nome, vínculo, e-mail e a versão; sem edição', (
    tester,
  ) async {
    await pumpProfile(tester);

    expect(find.text('Maria Silva'), findsWidgets);
    expect(find.text(AppStrings.linkStudent), findsOneWidget);
    expect(find.text('maria@instituicao.edu.br'), findsOneWidget);
    expect(find.text(AppStrings.appVersion('1.0.0 (7)')), findsOneWidget);
    expect(find.byType(TextField), findsNothing);
    expect(find.textContaining('senha'), findsNothing);
  });

  testWidgets('vínculo null fica oculto', (tester) async {
    const semVinculo = User(
      uuid: 'u-2',
      email: 'ana@instituicao.edu.br',
      name: 'Ana',
      institutionalLink: null,
      status: 'ACTIVE',
      roles: [],
      permissions: ['tickets:create'],
    );
    await session.loggedIn(semVinculo);
    await pumpProfile(tester);

    expect(find.text(AppStrings.profileLink), findsNothing);
    expect(find.text('ana@instituicao.edu.br'), findsOneWidget);
  });

  testWidgets('pull-to-refresh recarrega /auth/me', (tester) async {
    when(
      () => repository.me(),
    ).thenAnswer((_) async => buildUser(name: 'Maria S. Souza'));
    await pumpProfile(tester);

    await tester.fling(find.byType(ListView), const Offset(0, 400), 1000);
    await tester.pumpAndSettle();

    verify(() => repository.me()).called(1);
    expect(find.text('Maria S. Souza'), findsWidgets);
  });

  testWidgets('falha ao recarregar avisa e mantém os dados', (tester) async {
    when(() => repository.me()).thenThrow(const NetworkFailure());
    await pumpProfile(tester);

    await tester.fling(find.byType(ListView), const Offset(0, 400), 1000);
    await tester.pumpAndSettle();

    expect(find.text(AppStrings.errorNetwork), findsOneWidget);
    expect(find.text('maria@instituicao.edu.br'), findsOneWidget);
  });

  testWidgets('"Sair" pede confirmação; cancelar não sai', (tester) async {
    await pumpProfile(tester);

    await tester.tap(find.text(AppStrings.logout));
    await tester.pumpAndSettle();
    expect(find.text(AppStrings.logoutConfirmTitle), findsOneWidget);

    await tester.tap(find.text(AppStrings.cancel));
    await tester.pumpAndSettle();
    verifyNever(() => repository.logout());
    expect(session.state, isA<SessionAuthenticated>());
  });

  testWidgets('confirmar: encerra a sessão e avisa os caches', (tester) async {
    await pumpProfile(tester);

    await tester.tap(find.text(AppStrings.logout));
    await tester.pumpAndSettle();
    await tester.tap(confirmButton());
    await tester.runAsync(() => Future<void>.delayed(Duration.zero));
    await tester.pumpAndSettle();

    verify(() => repository.logout()).called(1);
    expect(session.state, const SessionUnauthenticated());
    expect(emitted, contains(isA<SessionEnded>()));
  });
}
