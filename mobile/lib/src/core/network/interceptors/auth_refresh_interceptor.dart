import 'dart:async';

import 'package:cookie_jar/cookie_jar.dart';
import 'package:dio/dio.dart';
import 'package:mobile/src/core/network/api_paths.dart';
import 'package:mobile/src/core/network/session_events.dart';

/// Renova a sessão em `401` e repete a requisição original.
///
/// - Um único `POST /auth/refresh` por vez: requisições concorrentes que
///   recebem 401 aguardam o mesmo refresh.
/// - Se o cookie `access_token` já mudou desde o envio (outro refresh terminou
///   nesse meio tempo), só repete, sem novo refresh.
/// - Se o refresh for recusado pela API, limpa o jar e emite [SessionExpired].
/// - Se o refresh falhar por rede, a sessão é mantida e o erro de rede sobe.
class AuthRefreshInterceptor extends Interceptor {
  AuthRefreshInterceptor({
    required Dio dio,
    required Dio refreshDio,
    required CookieJar cookieJar,
    required SessionEventBus sessionEvents,
  }) : _dio = dio,
       _refreshDio = refreshDio,
       _cookieJar = cookieJar,
       _sessionEvents = sessionEvents;

  final Dio _dio;
  final Dio _refreshDio;
  final CookieJar _cookieJar;
  final SessionEventBus _sessionEvents;

  Completer<bool>? _refreshing;

  static const _noRefreshPaths = {ApiPaths.authLogin, ApiPaths.authRefresh};

  @override
  Future<void> onError(
    DioException err,
    ErrorInterceptorHandler handler,
  ) async {
    final options = err.requestOptions;
    if (!_shouldRefresh(err)) {
      handler.next(err);
      return;
    }

    try {
      final tokenChanged = await _accessTokenChangedSince(options);
      final refreshed = tokenChanged || await _refreshOnce();
      if (!refreshed) {
        handler.next(err);
        return;
      }
    } on DioException catch (refreshError) {
      // Refresh sem resposta (rede): mantém a sessão e devolve o erro de rede.
      handler.next(
        DioException(
          requestOptions: options,
          type: refreshError.type,
          error: refreshError.error,
          message: refreshError.message,
        ),
      );
      return;
    }

    try {
      final response = await _dio.fetch<dynamic>(_retryOptions(options));
      handler.resolve(response);
    } on DioException catch (retryError) {
      handler.reject(retryError);
    }
  }

  bool _shouldRefresh(DioException err) {
    final options = err.requestOptions;
    if (err.response?.statusCode != 401) return false;
    if (options.extra[ApiExtra.skipAuthRefresh] == true) return false;
    if (options.extra[ApiExtra.authRetried] == true) return false;
    return !_noRefreshPaths.any(options.uri.path.endsWith);
  }

  /// Executa (ou aguarda) o refresh em andamento. `true` se renovou.
  Future<bool> _refreshOnce() {
    final inFlight = _refreshing;
    if (inFlight != null) return inFlight.future;

    final completer = _refreshing = Completer<bool>();
    unawaited(_runRefresh(completer));
    return completer.future;
  }

  Future<void> _runRefresh(Completer<bool> completer) async {
    try {
      await _refreshDio.post<dynamic>(ApiPaths.authRefresh);
      completer.complete(true);
    } on DioException catch (e) {
      if (e.response == null) {
        completer.completeError(e);
      } else {
        await _cookieJar.deleteAll();
        _sessionEvents.emit(const SessionExpired());
        completer.complete(false);
      }
    } catch (e, s) {
      completer.completeError(e, s);
    } finally {
      _refreshing = null;
    }
  }

  Future<bool> _accessTokenChangedSince(RequestOptions options) async {
    final sent = _cookieValue(
      options.headers['cookie'] as String?,
      ApiCookies.accessToken,
    );
    final current = (await _cookieJar.loadForRequest(options.uri))
        .where((cookie) => cookie.name == ApiCookies.accessToken)
        .map((cookie) => cookie.value)
        .firstOrNull;
    return current != null && current.isNotEmpty && current != sent;
  }

  String? _cookieValue(String? header, String name) {
    if (header == null) return null;
    for (final part in header.split(';')) {
      final index = part.indexOf('=');
      if (index > 0 && part.substring(0, index).trim() == name) {
        return part.substring(index + 1).trim();
      }
    }
    return null;
  }

  RequestOptions _retryOptions(RequestOptions options) {
    options.extra[ApiExtra.authRetried] = true;
    // Um FormData já enviado não pode ser reenviado (task 10: fotos).
    final data = options.data;
    if (data is FormData) options.data = data.clone();
    return options;
  }
}
