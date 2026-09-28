import 'dart:async';
import 'dart:typed_data';

import 'package:cookie_jar/cookie_jar.dart';
import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/src/core/errors/app_failure.dart';
import 'package:mobile/src/core/network/api_client.dart';
import 'package:mobile/src/core/network/api_paths.dart';
import 'package:mobile/src/core/network/session_events.dart';

import 'fake_api.dart';

void main() {
  late FakeSinalizaApi api;
  late CookieJar jar;
  late SessionEventBus events;
  late List<SessionEvent> emitted;
  late StreamSubscription<SessionEvent> sub;
  late ApiClient client;

  setUp(() {
    api = FakeSinalizaApi();
    jar = CookieJar();
    events = SessionEventBus();
    emitted = [];
    sub = events.events.listen(emitted.add);
    client = ApiClient(
      baseUrl: baseUrl,
      cookieJar: jar,
      sessionEvents: events,
      httpClientAdapter: api,
      enableLogging: false,
    );
  });

  tearDown(() async {
    await sub.cancel();
    await events.dispose();
  });

  Future<void> login() => client.post<dynamic>(
    ApiPaths.authLogin,
    data: {'identifier': 'ana', 'password': 'secret'},
  );

  group('sessão por cookies', () {
    test('após login, GET /auth/me funciona e devolve o data', () async {
      await login();
      final me = await client.get<Map<String, dynamic>>(ApiPaths.authMe);

      expect(me, fakeUser);
      expect(api.requests.last.uri.toString(), '$baseUrl/auth/me');
      expect(await client.hasSession(), isTrue);
    });

    test('POST /auth/logout envia x-xsrf-token e passa no CSRF', () async {
      await login();
      await client.post<void>(ApiPaths.authLogout);

      final logout = api.requests.last;
      expect(logout.headers[xsrfHeader], api.xsrf);
      expect(api.validAccess, isNull);
    });

    test('GET não envia x-xsrf-token', () async {
      await login();
      await client.get<dynamic>(ApiPaths.authMe);
      expect(api.requests.last.headers.containsKey(xsrfHeader), isFalse);
    });

    test('headers padrão, sem Content-Type global', () async {
      await login();
      await client.get<dynamic>(ApiPaths.authMe);
      final headers = api.requests.last.headers;

      expect(headers['Accept'], 'application/json');
      expect(headers['Accept-Language'], 'pt-BR');
      expect(api.requests.last.contentType, isNull);
    });

    test('clearSession apaga os cookies', () async {
      await login();
      await client.clearSession();

      expect(await client.hasSession(), isFalse);
      await expectLater(
        client.get<dynamic>(ApiPaths.authMe),
        throwsA(isA<UnauthorizedFailure>()),
      );
    });
  });

  group('refresh automático', () {
    test('access expirado: renova e repete sem o chamador perceber', () async {
      await login();
      api.expireAccess();

      final me = await client.get<Map<String, dynamic>>(ApiPaths.authMe);

      expect(me['name'], 'Ana');
      expect(api.refreshCalls, 1);
      expect(api.paths.skip(1), [
        '/api/v1/auth/me',
        '/api/v1/auth/refresh',
        '/api/v1/auth/me',
      ]);
      expect(emitted, isEmpty);
    });

    test('mutação repetida após refresh usa o novo XSRF-TOKEN', () async {
      await login();
      final oldXsrf = api.xsrf;
      api.expireAccess();

      await client.post<void>(ApiPaths.authLogout);

      expect(api.refreshCalls, 1);
      expect(api.requests.last.headers[xsrfHeader], api.xsrf);
      expect(api.xsrf, isNot(oldXsrf));
    });

    test('401 concorrentes disparam um único refresh', () async {
      await login();
      api
        ..expireAccess()
        ..refreshDelay = const Duration(milliseconds: 50);

      final results = await Future.wait([
        for (var i = 0; i < 4; i++)
          client.get<Map<String, dynamic>>(ApiPaths.authMe),
      ]);

      expect(results.every((me) => me['name'] == 'Ana'), isTrue);
      expect(api.refreshCalls, 1);
    });

    test('refresh inválido: limpa o jar, emite SessionExpired e lança '
        'UnauthorizedFailure', () async {
      await login();
      api
        ..expireAccess()
        ..revokeRefresh();

      await expectLater(
        client.get<dynamic>(ApiPaths.authMe),
        throwsA(isA<UnauthorizedFailure>()),
      );
      await Future<void>.delayed(Duration.zero);

      expect(emitted, [isA<SessionExpired>()]);
      expect(await client.hasSession(), isFalse);
      expect(api.refreshCalls, 1);
    });

    test('refresh inválido com concorrência emite um único evento', () async {
      await login();
      api
        ..expireAccess()
        ..revokeRefresh()
        ..refreshDelay = const Duration(milliseconds: 20);

      final results = await Future.wait([
        for (var i = 0; i < 3; i++)
          client
              .get<dynamic>(ApiPaths.authMe)
              .then<Object?>((_) => null, onError: (Object e) => e),
      ]);
      await Future<void>.delayed(Duration.zero);

      expect(results, everyElement(isA<UnauthorizedFailure>()));
      expect(emitted, hasLength(1));
      expect(api.refreshCalls, 1);
    });

    test('refresh sem rede: mantém a sessão e lança NetworkFailure', () async {
      await login();
      api
        ..expireAccess()
        ..refreshNetworkError = true;

      await expectLater(
        client.get<dynamic>(ApiPaths.authMe),
        throwsA(isA<NetworkFailure>()),
      );
      expect(emitted, isEmpty);
      expect(await client.hasSession(), isTrue);
    });

    test('401 no login não tenta refresh', () async {
      await expectLater(
        client.post<dynamic>(
          ApiPaths.authLogin,
          data: {'identifier': 'ana', 'password': 'errada'},
        ),
        throwsA(
          isA<UnauthorizedFailure>().having(
            (f) => f.message,
            'message',
            'Credenciais inválidas.',
          ),
        ),
      );
      expect(api.refreshCalls, 0);
    });

    test('skipAuthRefresh desliga a renovação', () async {
      await login();
      api.expireAccess();

      await expectLater(
        client.get<dynamic>(
          ApiPaths.authMe,
          options: Options(extra: {ApiExtra.skipAuthRefresh: true}),
        ),
        throwsA(isA<UnauthorizedFailure>()),
      );
      expect(api.refreshCalls, 0);
    });

    test('se a repetição também der 401, não entra em loop', () async {
      await login();
      api.routes['GET /tickets'] = (_) =>
          FakeReply.error(401, 'Não autenticado.');

      await expectLater(
        client.get<dynamic>('/tickets'),
        throwsA(isA<UnauthorizedFailure>()),
      );
      expect(api.refreshCalls, 1);
      expect(api.paths.where((p) => p.endsWith('/tickets')), hasLength(2));
    });
  });

  group('envelope', () {
    test('lista paginada: desembrulha só o envelope externo', () async {
      api.routes['GET /tickets'] = (_) => FakeReply.ok({
        'data': [
          {'id': 1},
        ],
        'meta': {'total': 1},
      });

      final page = await client.get<Map<String, dynamic>>('/tickets');
      expect(page['data'], [
        {'id': 1},
      ]);
      expect(page['meta'], {'total': 1});
    });

    test('204 vira null', () async {
      api.routes['DELETE /devices/push-token'] = (_) => const FakeReply(204);
      expect(await client.delete<Object?>('/devices/push-token'), isNull);
    });

    test('corpo fora do envelope passa intacto', () async {
      api.routes['GET /health'] = (_) =>
          const FakeReply(200, body: {'status': 'ok'});
      expect(await client.get<Map<String, dynamic>>('/health'), {
        'status': 'ok',
      });
    });

    test('resposta binária não é desembrulhada', () async {
      final bytes = Uint8List.fromList([1, 2, 3]);
      api.routes['GET /files/x'] = (_) => FakeReply(200, body: bytes);

      final result = await client.get<List<int>>(
        '/files/x',
        options: Options(responseType: ResponseType.bytes),
      );
      expect(result, [1, 2, 3]);
    });
  });
}
