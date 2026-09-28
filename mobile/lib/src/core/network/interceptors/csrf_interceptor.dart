import 'package:cookie_jar/cookie_jar.dart';
import 'package:dio/dio.dart';
import 'package:mobile/src/core/network/api_paths.dart';

/// Double-submit CSRF: em POST/PUT/PATCH/DELETE, copia o cookie `XSRF-TOKEN`
/// para o header `x-xsrf-token`. Roda em toda tentativa (inclusive na
/// repetição pós-refresh), então sempre usa o token mais recente do jar.
class CsrfInterceptor extends Interceptor {
  CsrfInterceptor(this._cookieJar);

  final CookieJar _cookieJar;

  static const _mutatingMethods = {'POST', 'PUT', 'PATCH', 'DELETE'};

  @override
  Future<void> onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    if (_mutatingMethods.contains(options.method.toUpperCase())) {
      final cookies = await _cookieJar.loadForRequest(options.uri);
      final token = cookies
          .where((cookie) => cookie.name == ApiCookies.xsrfToken)
          .map((cookie) => cookie.value)
          .firstOrNull;

      if (token != null && token.isNotEmpty) {
        options.headers[xsrfHeader] = token;
      } else {
        options.headers.remove(xsrfHeader);
      }
    }
    handler.next(options);
  }
}
