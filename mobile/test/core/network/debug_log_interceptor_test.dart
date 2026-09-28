import 'package:cookie_jar/cookie_jar.dart';
import 'package:dio/dio.dart';
import 'package:dio_cookie_manager/dio_cookie_manager.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/src/core/network/interceptors/debug_log_interceptor.dart';

import 'fake_api.dart';

void main() {
  test('log não contém cookies, CSRF nem senha', () async {
    final lines = <String>[];
    final jar = CookieJar();
    final dio = Dio(BaseOptions(baseUrl: baseUrl))
      ..httpClientAdapter = FakeSinalizaApi()
      ..interceptors.addAll([
        CookieManager(jar),
        DebugLogInterceptor(logger: lines.add),
      ]);

    await dio.post<dynamic>(
      '/auth/login',
      data: {'identifier': 'ana', 'password': 'secret'},
    );
    await dio.get<dynamic>('/auth/me');

    final log = lines.join('\n');
    expect(log, contains('--> POST /api/v1/auth/login'));
    expect(log, contains('<-- 200 GET /api/v1/auth/me'));
    expect(log, isNot(contains('secret')));
    expect(log, isNot(contains('access_token')));
    expect(log, isNot(contains('XSRF')));
  });
}
