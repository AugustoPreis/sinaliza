import 'package:cookie_jar/cookie_jar.dart';
import 'package:dio/dio.dart';
import 'package:dio_cookie_manager/dio_cookie_manager.dart';
import 'package:flutter/foundation.dart';
import 'package:mobile/src/core/errors/app_failure.dart';
import 'package:mobile/src/core/errors/failure_mapper.dart';
import 'package:mobile/src/core/network/api_paths.dart';
import 'package:mobile/src/core/network/interceptors/auth_refresh_interceptor.dart';
import 'package:mobile/src/core/network/interceptors/csrf_interceptor.dart';
import 'package:mobile/src/core/network/interceptors/debug_log_interceptor.dart';
import 'package:mobile/src/core/network/interceptors/envelope_interceptor.dart';
import 'package:mobile/src/core/network/session_events.dart';
import 'package:mobile/src/core/utils/constants/network_constant.dart';

/// Cliente HTTP único do app.
///
/// Sessão por cookies (jar persistente), CSRF, desembrulho do envelope
/// `{success, data}` e renovação automática do token em 401. Os métodos
/// devolvem o `data` já desembrulhado e lançam [AppFailure] em caso de erro.
class ApiClient {
  ApiClient({
    required String baseUrl,
    required CookieJar cookieJar,
    required SessionEventBus sessionEvents,
    HttpClientAdapter? httpClientAdapter,
    bool enableLogging = kDebugMode,
  }) : _cookieJar = cookieJar,
       dio = Dio(_baseOptions(baseUrl)) {
    final refreshDio = Dio(_baseOptions(baseUrl))
      ..interceptors.add(CookieManager(cookieJar));

    if (httpClientAdapter != null) {
      dio.httpClientAdapter = httpClientAdapter;
      refreshDio.httpClientAdapter = httpClientAdapter;
    }

    dio.interceptors.addAll([
      CookieManager(cookieJar),
      CsrfInterceptor(cookieJar),
      AuthRefreshInterceptor(
        dio: dio,
        refreshDio: refreshDio,
        cookieJar: cookieJar,
        sessionEvents: sessionEvents,
      ),
      EnvelopeInterceptor(),
      if (enableLogging) DebugLogInterceptor(),
    ]);
  }

  /// Acesso direto para casos especiais (ex.: progresso de upload).
  /// Prefira os métodos abaixo, que já mapeiam os erros.
  final Dio dio;
  final CookieJar _cookieJar;

  static BaseOptions _baseOptions(String baseUrl) {
    return BaseOptions(
      baseUrl: baseUrl,
      connectTimeout: connectTimeout,
      receiveTimeout: receiveTimeout,
      responseType: ResponseType.json,
      // Sem Content-Type global: o Dio escolhe JSON para Map e multipart
      // para FormData (task 10).
      headers: const {'Accept': 'application/json', 'Accept-Language': 'pt-BR'},
    );
  }

  Future<T> get<T>(
    String path, {
    Map<String, dynamic>? queryParameters,
    Options? options,
    CancelToken? cancelToken,
  }) {
    return _send(
      () => dio.get<dynamic>(
        path,
        queryParameters: queryParameters,
        options: options,
        cancelToken: cancelToken,
      ),
    );
  }

  Future<T> post<T>(
    String path, {
    Object? data,
    Map<String, dynamic>? queryParameters,
    Options? options,
    CancelToken? cancelToken,
    ProgressCallback? onSendProgress,
  }) {
    return _send(
      () => dio.post<dynamic>(
        path,
        data: data,
        queryParameters: queryParameters,
        options: options,
        cancelToken: cancelToken,
        onSendProgress: onSendProgress,
      ),
    );
  }

  Future<T> patch<T>(
    String path, {
    Object? data,
    Options? options,
    CancelToken? cancelToken,
  }) {
    return _send(
      () => dio.patch<dynamic>(
        path,
        data: data,
        options: options,
        cancelToken: cancelToken,
      ),
    );
  }

  Future<T> put<T>(
    String path, {
    Object? data,
    Options? options,
    CancelToken? cancelToken,
  }) {
    return _send(
      () => dio.put<dynamic>(
        path,
        data: data,
        options: options,
        cancelToken: cancelToken,
      ),
    );
  }

  Future<T> delete<T>(
    String path, {
    Object? data,
    Options? options,
    CancelToken? cancelToken,
  }) {
    return _send(
      () => dio.delete<dynamic>(
        path,
        data: data,
        options: options,
        cancelToken: cancelToken,
      ),
    );
  }

  /// Há sessão salva? (cookie de refresh presente no jar).
  Future<bool> hasSession() async {
    final uri = Uri.parse('${dio.options.baseUrl}${ApiPaths.authRefresh}');
    final cookies = await _cookieJar.loadForRequest(uri);
    return cookies.any((cookie) => cookie.name == ApiCookies.refreshToken);
  }

  /// Apaga todos os cookies (logout e sessão expirada).
  Future<void> clearSession() => _cookieJar.deleteAll();

  Future<T> _send<T>(Future<Response<dynamic>> Function() request) async {
    try {
      final response = await request();
      return response.data as T;
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }
}
