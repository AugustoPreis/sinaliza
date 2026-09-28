import 'dart:developer' as developer;

import 'package:dio/dio.dart';
import 'package:mobile/src/core/network/api_paths.dart';

/// Log de requisições para debug: método, caminho, status e duração.
///
/// Não loga headers (cookies, CSRF) nem corpos (senha, relato, fotos).
class DebugLogInterceptor extends Interceptor {
  DebugLogInterceptor({void Function(String message)? logger})
    : _log = logger ?? ((message) => developer.log(message, name: 'http'));

  final void Function(String message) _log;

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    options.extra[ApiExtra.startedAt] = DateTime.now();
    _log('--> ${options.method} ${options.uri.path}${_retryTag(options)}');
    handler.next(options);
  }

  @override
  void onResponse(
    Response<dynamic> response,
    ResponseInterceptorHandler handler,
  ) {
    final options = response.requestOptions;
    _log(
      '<-- ${response.statusCode} ${options.method} ${options.uri.path} '
      '(${_elapsed(options)})',
    );
    handler.next(response);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    final options = err.requestOptions;
    final status = err.response?.statusCode?.toString() ?? err.type.name;
    _log(
      '<-x $status ${options.method} ${options.uri.path} '
      '(${_elapsed(options)})',
    );
    handler.next(err);
  }

  String _retryTag(RequestOptions options) =>
      options.extra[ApiExtra.authRetried] == true ? ' (retry)' : '';

  String _elapsed(RequestOptions options) {
    final startedAt = options.extra[ApiExtra.startedAt];
    if (startedAt is! DateTime) return '?';
    return '${DateTime.now().difference(startedAt).inMilliseconds} ms';
  }
}
