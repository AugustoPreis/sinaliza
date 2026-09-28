import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';

const baseUrl = 'http://api.test/api/v1';

/// Usuário no formato real de `MeResponseDTO` (camelCase).
const fakeUser = <String, Object?>{
  'uuid': 'u-1',
  'email': 'ana@instituicao.edu.br',
  'name': 'Ana',
  'institutionalLink': 'ALUNO',
  'status': 'ACTIVE',
  'roles': [
    {'uuid': 'r-1', 'name': 'REQUESTER'},
  ],
  'permissions': ['tickets:create'],
};

/// Resposta simulada.
class FakeReply {
  const FakeReply(this.status, {this.body, this.setCookies = const []});

  final int status;
  final Object? body;
  final List<String> setCookies;

  static FakeReply ok(Object? data, {List<String> setCookies = const []}) =>
      FakeReply(
        200,
        body: {'success': true, 'data': data, 'timestamp': 'now'},
        setCookies: setCookies,
      );

  static FakeReply error(int status, Object message, {String? code}) =>
      FakeReply(
        status,
        body: {
          'success': false,
          'statusCode': status,
          'message': message,
          'code': ?code,
          'path': '/x',
          'timestamp': 'now',
        },
      );
}

/// Simula a API do Sinaliza: cookies httpOnly de sessão, `XSRF-TOKEN`,
/// refresh com rotação e rotas protegidas por CSRF.
class FakeSinalizaApi implements HttpClientAdapter {
  final List<RequestOptions> requests = [];

  int _generation = 0;
  String? validAccess;
  String? validRefresh;
  String? xsrf;
  int refreshCalls = 0;

  /// Atraso do refresh, para testar concorrência.
  Duration refreshDelay = Duration.zero;

  /// Faz o refresh falhar sem resposta (rede).
  bool refreshNetworkError = false;

  /// Rotas extras: `'<METHOD> <path>'` -> resposta.
  final Map<String, FutureOr<FakeReply> Function(RequestOptions)> routes = {};

  List<String> get paths => requests.map((r) => r.uri.path).toList();

  /// Access token expira (o próximo request autenticado recebe 401).
  void expireAccess() => validAccess = 'expired';

  /// Refresh token revogado/expirado.
  void revokeRefresh() => validRefresh = null;

  List<String> _issueSession() {
    _generation++;
    validAccess = 'access-$_generation';
    validRefresh = 'refresh-$_generation';
    xsrf = 'xsrf-$_generation';
    return [
      'access_token=$validAccess; Max-Age=900; Path=/; HttpOnly; SameSite=Lax',
      'refresh_token=$validRefresh; Max-Age=604800; '
          'Path=/api/v1/auth/refresh; HttpOnly; SameSite=Lax',
      'XSRF-TOKEN=$xsrf; Max-Age=604800; Path=/; SameSite=Lax',
    ];
  }

  Map<String, String> _cookies(RequestOptions options) {
    final header = options.headers['cookie'] as String?;
    if (header == null) return {};
    return {
      for (final part in header.split(';'))
        if (part.contains('='))
          part.split('=').first.trim(): part.split('=').sublist(1).join('='),
    };
  }

  bool _authenticated(RequestOptions options) =>
      validAccess != null && _cookies(options)['access_token'] == validAccess;

  bool _csrfOk(RequestOptions options) {
    final cookie = _cookies(options)['XSRF-TOKEN'];
    return cookie != null && cookie == options.headers['x-xsrf-token'];
  }

  Future<FakeReply> _handle(RequestOptions options) async {
    final path = options.uri.path.replaceFirst('/api/v1', '');
    final key = '${options.method} $path';

    final custom = routes[key];
    if (custom != null) return custom(options);

    switch (key) {
      case 'POST /auth/login':
        final body = options.data as Map<String, dynamic>;
        if (body['password'] != 'secret') {
          return FakeReply.error(401, 'Credenciais inválidas.');
        }
        return FakeReply.ok({'user': fakeUser}, setCookies: _issueSession());
      case 'POST /auth/refresh':
        refreshCalls++;
        await Future<void>.delayed(refreshDelay);
        if (refreshNetworkError) {
          throw DioException.connectionError(
            requestOptions: options,
            reason: 'offline',
          );
        }
        final sent = _cookies(options)['refresh_token'];
        if (validRefresh == null || sent != validRefresh) {
          return FakeReply.error(401, 'Sessão inválida.');
        }
        return FakeReply.ok({'user': fakeUser}, setCookies: _issueSession());
      case 'GET /auth/me':
        if (!_authenticated(options)) {
          return FakeReply.error(401, 'Não autenticado.');
        }
        return FakeReply.ok(fakeUser);
      case 'POST /auth/logout':
        if (!_authenticated(options)) {
          return FakeReply.error(401, 'Não autenticado.');
        }
        if (!_csrfOk(options)) {
          return FakeReply.error(403, 'Token CSRF inválido.');
        }
        validAccess = null;
        validRefresh = null;
        return const FakeReply(204);
    }
    return FakeReply.error(404, 'Rota não encontrada.');
  }

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    requests.add(options);
    // Consome o corpo (como um servidor real): dispara o onSendProgress.
    await requestStream?.drain<void>();
    final reply = await _handle(options);
    final body = reply.body;
    final headers = <String, List<String>>{
      if (reply.setCookies.isNotEmpty) 'set-cookie': reply.setCookies,
    };

    if (body is Uint8List) {
      return ResponseBody.fromBytes(
        body,
        reply.status,
        headers: {
          ...headers,
          'content-type': ['application/octet-stream'],
        },
      );
    }
    return ResponseBody.fromString(
      body == null ? '' : jsonEncode(body),
      reply.status,
      headers: {
        ...headers,
        if (body != null) 'content-type': ['application/json; charset=utf-8'],
      },
    );
  }

  @override
  void close({bool force = false}) {}
}
