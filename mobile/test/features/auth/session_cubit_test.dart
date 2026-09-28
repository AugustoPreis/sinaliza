import 'package:bloc_test/bloc_test.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/src/core/errors/app_failure.dart';
import 'package:mobile/src/core/l10n/app_strings.dart';
import 'package:mobile/src/core/network/session_events.dart';
import 'package:mobile/src/features/auth/domain/repositories/auth_repository.dart';
import 'package:mobile/src/features/auth/presentation/cubit/session_cubit.dart';
import 'package:mocktail/mocktail.dart';

import '../../helpers/test_data.dart';

class MockAuthRepository extends Mock implements AuthRepository {}

void main() {
  late MockAuthRepository repository;
  late SessionEventBus events;

  setUp(() {
    repository = MockAuthRepository();
    events = SessionEventBus();
    when(() => repository.hasSession()).thenAnswer((_) async => true);
    when(() => repository.clearSession()).thenAnswer((_) async {});
    when(() => repository.logout()).thenAnswer((_) async {});
  });

  tearDown(() => events.dispose());

  SessionCubit build() =>
      SessionCubit(repository: repository, sessionEvents: events);

  group('checkSession', () {
    blocTest<SessionCubit, SessionState>(
      'sem cookie de sessão vai para o login sem chamar a API',
      setUp: () =>
          when(() => repository.hasSession()).thenAnswer((_) async => false),
      build: build,
      act: (cubit) => cubit.checkSession(),
      expect: () => [const SessionUnauthenticated()],
      verify: (_) => verifyNever(() => repository.me()),
    );

    blocTest<SessionCubit, SessionState>(
      'sessão válida de solicitante -> authenticated',
      setUp: () =>
          when(() => repository.me()).thenAnswer((_) async => requester),
      build: build,
      act: (cubit) => cubit.checkSession(),
      expect: () => [SessionAuthenticated(requester)],
    );

    blocTest<SessionCubit, SessionState>(
      'conta sem tickets:create -> noAccess',
      setUp: () =>
          when(() => repository.me()).thenAnswer((_) async => sectorStaff),
      build: build,
      act: (cubit) => cubit.checkSession(),
      expect: () => [SessionNoAccess(sectorStaff)],
    );

    blocTest<SessionCubit, SessionState>(
      '401 (refresh falhou) -> unauthenticated e limpa a sessão',
      setUp: () =>
          when(() => repository.me()).thenThrow(const UnauthorizedFailure()),
      build: build,
      act: (cubit) => cubit.checkSession(),
      expect: () => [const SessionUnauthenticated()],
      verify: (_) => verify(() => repository.clearSession()).called(1),
    );

    blocTest<SessionCubit, SessionState>(
      '404 (usuário removido) -> unauthenticated',
      setUp: () =>
          when(() => repository.me()).thenThrow(const NotFoundFailure()),
      build: build,
      act: (cubit) => cubit.checkSession(),
      expect: () => [const SessionUnauthenticated()],
    );

    blocTest<SessionCubit, SessionState>(
      'sem rede -> checkFailed (não manda para o login)',
      setUp: () =>
          when(() => repository.me()).thenThrow(const NetworkFailure()),
      build: build,
      act: (cubit) => cubit.checkSession(),
      expect: () => [const SessionCheckFailed(NetworkFailure())],
      verify: (_) => verifyNever(() => repository.clearSession()),
    );

    blocTest<SessionCubit, SessionState>(
      'tentar novamente passa por unknown antes do resultado',
      setUp: () =>
          when(() => repository.me()).thenAnswer((_) async => requester),
      build: build,
      seed: () => const SessionCheckFailed(NetworkFailure()),
      act: (cubit) => cubit.checkSession(),
      expect: () => [const SessionUnknown(), SessionAuthenticated(requester)],
    );

    blocTest<SessionCubit, SessionState>(
      'conta inativa (acesso revogado) -> logout e login com aviso',
      setUp: () => when(
        () => repository.me(),
      ).thenAnswer((_) async => buildUser(status: 'INACTIVE')),
      build: build,
      act: (cubit) => cubit.checkSession(),
      expect: () => [
        const SessionUnauthenticated(message: AppStrings.sessionExpired),
      ],
      verify: (_) => verify(() => repository.logout()).called(1),
    );
  });

  group('eventos', () {
    blocTest<SessionCubit, SessionState>(
      'SessionExpired autenticado -> login com "sessão expirou"',
      build: build,
      seed: () => SessionAuthenticated(requester),
      act: (_) => events.emit(const SessionExpired()),
      expect: () => [
        const SessionUnauthenticated(message: AppStrings.sessionExpired),
      ],
    );

    blocTest<SessionCubit, SessionState>(
      'SessionExpired no splash/login é ignorado',
      build: build,
      seed: () => const SessionUnauthenticated(),
      act: (_) => events.emit(const SessionExpired()),
      expect: () => <SessionState>[],
    );
  });

  group('login/logout', () {
    blocTest<SessionCubit, SessionState>(
      'loggedIn com solicitante -> authenticated',
      build: build,
      seed: () => const SessionUnauthenticated(),
      act: (cubit) => cubit.loggedIn(requester),
      expect: () => [SessionAuthenticated(requester)],
    );

    blocTest<SessionCubit, SessionState>(
      'loggedIn com conta de setor -> noAccess',
      build: build,
      seed: () => const SessionUnauthenticated(),
      act: (cubit) => cubit.loggedIn(sectorStaff),
      expect: () => [SessionNoAccess(sectorStaff)],
    );

    blocTest<SessionCubit, SessionState>(
      'logout -> unauthenticated sem mensagem',
      build: build,
      seed: () => SessionAuthenticated(requester),
      act: (cubit) => cubit.logout(),
      expect: () => [const SessionUnauthenticated()],
      verify: (_) => verify(() => repository.logout()).called(1),
    );

    blocTest<SessionCubit, SessionState>(
      'userUpdated só atualiza quando autenticado',
      build: build,
      seed: () => SessionAuthenticated(requester),
      act: (cubit) => cubit.userUpdated(buildUser(name: 'Maria S.')),
      expect: () => [SessionAuthenticated(buildUser(name: 'Maria S.'))],
    );
  });

  group('SessionEnded (limpeza de caches)', () {
    Future<List<SessionEvent>> collect(
      Future<void> Function(SessionCubit) act, {
      required SessionState seed,
    }) async {
      final received = <SessionEvent>[];
      final sub = events.events.listen(received.add);
      final cubit = build()..emit(seed);
      await act(cubit);
      await Future<void>.delayed(Duration.zero);
      await sub.cancel();
      await cubit.close();
      return received.whereType<SessionEnded>().toList();
    }

    test('logout de sessão ativa emite SessionEnded', () async {
      final ended = await collect(
        (cubit) => cubit.logout(),
        seed: SessionAuthenticated(requester),
      );
      expect(ended, hasLength(1));
    });

    test('expiração emite SessionEnded', () async {
      final ended = await collect((_) async {
        events.emit(const SessionExpired());
        await Future<void>.delayed(Duration.zero);
      }, seed: SessionNoAccess(sectorStaff));
      expect(ended, hasLength(1));
    });

    test('splash sem sessão não emite SessionEnded', () async {
      when(() => repository.hasSession()).thenAnswer((_) async => false);
      final ended = await collect(
        (cubit) => cubit.checkSession(),
        seed: const SessionUnknown(),
      );
      expect(ended, isEmpty);
    });
  });
}
