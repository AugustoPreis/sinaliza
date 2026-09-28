import 'dart:async';

import 'package:bloc_test/bloc_test.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/src/core/errors/app_failure.dart';
import 'package:mobile/src/core/l10n/app_strings.dart';
import 'package:mobile/src/core/network/session_events.dart';
import 'package:mobile/src/features/auth/presentation/cubit/forgot_password_cubit.dart';
import 'package:mobile/src/features/auth/presentation/cubit/login_cubit.dart';
import 'package:mobile/src/features/auth/presentation/cubit/session_cubit.dart';
import 'package:mocktail/mocktail.dart';

import '../../helpers/test_data.dart';
import 'session_cubit_test.dart' show MockAuthRepository;

void main() {
  late MockAuthRepository repository;
  late SessionEventBus events;
  late SessionCubit session;

  setUp(() {
    repository = MockAuthRepository();
    events = SessionEventBus();
    session = SessionCubit(repository: repository, sessionEvents: events);
  });

  tearDown(() async {
    await session.close();
    await events.dispose();
  });

  LoginCubit build() => LoginCubit(repository: repository, session: session);

  void stubLogin(Future<Never> Function() error) => when(
    () => repository.login(
      identifier: any(named: 'identifier'),
      password: any(named: 'password'),
    ),
  ).thenAnswer((_) => error());

  group('LoginCubit', () {
    blocTest<LoginCubit, LoginState>(
      'campos vazios: erros por campo, sem chamar a API',
      build: build,
      act: (cubit) => cubit.submit(identifier: '   ', password: ''),
      expect: () => [
        const LoginState(
          identifierError: AppStrings.loginIdentifierRequired,
          passwordError: AppStrings.loginPasswordRequired,
        ),
      ],
      verify: (_) => verifyNever(
        () => repository.login(
          identifier: any(named: 'identifier'),
          password: any(named: 'password'),
        ),
      ),
    );

    blocTest<LoginCubit, LoginState>(
      'sucesso com matrícula: envia sem espaços e entrega o usuário à sessão',
      setUp: () => when(
        () => repository.login(identifier: '2023001234', password: 'x'),
      ).thenAnswer((_) async => requester),
      build: build,
      act: (cubit) => cubit.submit(identifier: ' 2023001234 ', password: 'x'),
      expect: () => [const LoginState(isSubmitting: true), const LoginState()],
      verify: (_) => expect(session.state, SessionAuthenticated(requester)),
    );

    blocTest<LoginCubit, LoginState>(
      '401 -> mensagem genérica (não revela se a conta existe)',
      setUp: () => stubLogin(
        () => throw const UnauthorizedFailure('Usuário não encontrado.'),
      ),
      build: build,
      act: (cubit) => cubit.submit(identifier: 'maria', password: 'x'),
      expect: () => [
        const LoginState(isSubmitting: true),
        const LoginState(errorMessage: AppStrings.loginInvalidCredentials),
      ],
    );

    blocTest<LoginCubit, LoginState>(
      '429 -> muitas tentativas',
      setUp: () => stubLogin(() => throw const RateLimitFailure()),
      build: build,
      act: (cubit) => cubit.submit(identifier: 'maria', password: 'x'),
      expect: () => [
        const LoginState(isSubmitting: true),
        const LoginState(errorMessage: AppStrings.loginRateLimited),
      ],
    );

    blocTest<LoginCubit, LoginState>(
      'sem rede -> mensagem de conexão',
      setUp: () => stubLogin(() => throw const NetworkFailure()),
      build: build,
      act: (cubit) => cubit.submit(identifier: 'maria', password: 'x'),
      expect: () => [
        const LoginState(isSubmitting: true),
        const LoginState(errorMessage: AppStrings.errorNetwork),
      ],
    );

    test('não permite duplo envio', () async {
      final pending = Completer<void>();
      when(
        () => repository.login(
          identifier: any(named: 'identifier'),
          password: any(named: 'password'),
        ),
      ).thenAnswer((_) async {
        await pending.future;
        return requester;
      });
      final cubit = build();

      final first = cubit.submit(identifier: 'maria', password: 'x');
      final second = await cubit.submit(identifier: 'maria', password: 'x');
      pending.complete();

      expect(second, isFalse);
      expect(await first, isTrue);
      verify(
        () => repository.login(
          identifier: any(named: 'identifier'),
          password: any(named: 'password'),
        ),
      ).called(1);
      await cubit.close();
    });

    blocTest<LoginCubit, LoginState>(
      'digitar de novo limpa o erro',
      build: build,
      seed: () => const LoginState(errorMessage: 'x'),
      act: (cubit) => cubit.fieldChanged(),
      expect: () => [const LoginState()],
    );
  });

  group('ForgotPasswordCubit', () {
    ForgotPasswordCubit buildForgot() =>
        ForgotPasswordCubit(repository: repository);

    blocTest<ForgotPasswordCubit, ForgotPasswordState>(
      'matrícula não é aceita (só e-mail)',
      build: buildForgot,
      act: (cubit) => cubit.submit('2023001234'),
      expect: () => [
        const ForgotPasswordState(
          emailError: AppStrings.forgotPasswordEmailInvalid,
        ),
      ],
      verify: (_) => verifyNever(() => repository.forgotPassword(any())),
    );

    blocTest<ForgotPasswordCubit, ForgotPasswordState>(
      'vazio -> campo obrigatório',
      build: buildForgot,
      act: (cubit) => cubit.submit(' '),
      expect: () => [
        const ForgotPasswordState(
          emailError: AppStrings.forgotPasswordEmailRequired,
        ),
      ],
    );

    blocTest<ForgotPasswordCubit, ForgotPasswordState>(
      'e-mail válido -> confirmação neutra',
      setUp: () => when(
        () => repository.forgotPassword('maria@x.edu.br'),
      ).thenAnswer((_) async {}),
      build: buildForgot,
      act: (cubit) => cubit.submit(' maria@x.edu.br '),
      expect: () => [
        const ForgotPasswordState(isSubmitting: true),
        const ForgotPasswordState(sent: true),
      ],
    );

    blocTest<ForgotPasswordCubit, ForgotPasswordState>(
      '404 também mostra a confirmação neutra',
      setUp: () => when(
        () => repository.forgotPassword(any()),
      ).thenThrow(const NotFoundFailure()),
      build: buildForgot,
      act: (cubit) => cubit.submit('maria@x.edu.br'),
      expect: () => [
        const ForgotPasswordState(isSubmitting: true),
        const ForgotPasswordState(sent: true),
      ],
    );

    blocTest<ForgotPasswordCubit, ForgotPasswordState>(
      '429 -> muitas tentativas',
      setUp: () => when(
        () => repository.forgotPassword(any()),
      ).thenThrow(const RateLimitFailure()),
      build: buildForgot,
      act: (cubit) => cubit.submit('maria@x.edu.br'),
      expect: () => [
        const ForgotPasswordState(isSubmitting: true),
        const ForgotPasswordState(errorMessage: AppStrings.loginRateLimited),
      ],
    );
  });
}
