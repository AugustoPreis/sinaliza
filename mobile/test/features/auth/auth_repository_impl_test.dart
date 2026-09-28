import 'package:cookie_jar/cookie_jar.dart';
import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/src/core/errors/app_failure.dart';
import 'package:mobile/src/core/network/api_client.dart';
import 'package:mobile/src/core/network/session_events.dart';
import 'package:mobile/src/features/auth/data/datasources/auth_remote_datasource.dart';
import 'package:mobile/src/features/auth/data/repositories/auth_repository_impl.dart';
import 'package:mobile/src/shared/domain/enums/institutional_link.dart';

import '../../core/network/fake_api.dart';

void main() {
  late FakeSinalizaApi api;
  late AuthRepositoryImpl repository;
  late SessionEventBus events;

  setUp(() {
    api = FakeSinalizaApi();
    events = SessionEventBus();
    final client = ApiClient(
      baseUrl: baseUrl,
      cookieJar: CookieJar(),
      sessionEvents: events,
      httpClientAdapter: api,
      enableLogging: false,
    );
    repository = AuthRepositoryImpl(AuthRemoteDataSource(client));
  });

  tearDown(() => events.dispose());

  test('login envia identifier/password e devolve o usuário', () async {
    final user = await repository.login(identifier: 'ana', password: 'secret');

    expect(api.requests.single.data, {
      'identifier': 'ana',
      'password': 'secret',
    });
    expect(user.name, 'Ana');
    expect(user.institutionalLink, InstitutionalLink.student);
    expect(user.canUseRequesterApp, isTrue);
  });

  test('me devolve o usuário da sessão', () async {
    await repository.login(identifier: 'ana', password: 'secret');
    final user = await repository.me();
    expect(user.uuid, 'u-1');
  });

  test('hasSession reflete login e logout', () async {
    expect(await repository.hasSession(), isFalse);

    await repository.login(identifier: 'ana', password: 'secret');
    expect(await repository.hasSession(), isTrue);

    await repository.logout();
    expect(await repository.hasSession(), isFalse);
    expect(api.paths.last, '/api/v1/auth/logout');
  });

  test('logout apaga a sessão local mesmo sem rede', () async {
    await repository.login(identifier: 'ana', password: 'secret');
    api.routes['POST /auth/logout'] = (options) =>
        throw DioException.connectionError(
          requestOptions: options,
          reason: 'offline',
        );

    await repository.logout();
    expect(await repository.hasSession(), isFalse);
  });

  test(
    'credenciais inválidas -> UnauthorizedFailure com a mensagem da API',
    () {
      expect(
        repository.login(identifier: 'ana', password: 'errada'),
        throwsA(
          isA<UnauthorizedFailure>().having(
            (f) => f.message,
            'message',
            'Credenciais inválidas.',
          ),
        ),
      );
    },
  );

  test('payload fora do formato -> UnknownFailure', () async {
    await repository.login(identifier: 'ana', password: 'secret');
    api.routes['GET /auth/me'] = (_) => FakeReply.ok({'name': 'sem uuid'});

    expect(repository.me(), throwsA(isA<UnknownFailure>()));
  });

  test('forgotPassword envia só o e-mail', () async {
    api.routes['POST /auth/forgot-password'] = (_) => const FakeReply(204);

    await repository.forgotPassword('ana@instituicao.edu.br');
    expect(api.requests.last.data, {'email': 'ana@instituicao.edu.br'});
  });
}
