import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/src/core/config/env.dart';

void main() {
  test('API_BASE_URL vazia falha com instrução', () {
    expect(
      () => validateApiBaseUrl('', isRelease: false),
      throwsA(
        isA<StateError>().having(
          (e) => e.message,
          'message',
          contains('env/dev.json'),
        ),
      ),
    );
  });

  test('release exige HTTPS (cookies secure)', () {
    expect(
      () => validateApiBaseUrl('http://10.0.2.2:3000/api/v1', isRelease: true),
      throwsStateError,
    );
    expect(
      () => validateApiBaseUrl(
        'https://api.sinaliza.edu.br/api/v1',
        isRelease: true,
      ),
      returnsNormally,
    );
  });

  test('debug aceita HTTP (API local)', () {
    expect(
      () => validateApiBaseUrl('http://10.0.2.2:3000/api/v1', isRelease: false),
      returnsNormally,
    );
  });
}
