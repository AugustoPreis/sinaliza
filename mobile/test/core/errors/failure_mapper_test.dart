import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/src/core/errors/app_failure.dart';
import 'package:mobile/src/core/errors/failure_mapper.dart';
import 'package:mobile/src/core/l10n/app_strings.dart';

void main() {
  final options = RequestOptions(path: '/x');

  DioException withResponse(int status, [Object? body]) => DioException(
    requestOptions: options,
    type: DioExceptionType.badResponse,
    response: Response<dynamic>(
      requestOptions: options,
      statusCode: status,
      data: body,
    ),
  );

  Map<String, dynamic> apiError(int status, Object message, {String? code}) => {
    'success': false,
    'statusCode': status,
    'message': message,
    'code': ?code,
  };

  group('sem resposta', () {
    for (final type in [
      DioExceptionType.connectionTimeout,
      DioExceptionType.sendTimeout,
      DioExceptionType.receiveTimeout,
      DioExceptionType.connectionError,
      DioExceptionType.badCertificate,
    ]) {
      test('$type -> NetworkFailure', () {
        final failure = mapDioException(
          DioException(requestOptions: options, type: type),
        );
        expect(failure, isA<NetworkFailure>());
        expect(failure.message, AppStrings.errorNetwork);
      });
    }

    test('unknown sem resposta (socket) -> NetworkFailure', () {
      expect(
        mapDioException(DioException(requestOptions: options)),
        isA<NetworkFailure>(),
      );
    });

    test('cancelamento -> UnknownFailure', () {
      expect(
        mapDioException(
          DioException(requestOptions: options, type: DioExceptionType.cancel),
        ),
        isA<UnknownFailure>(),
      );
    });
  });

  group('por status', () {
    test('400 com lista de mensagens -> ValidationFailure', () {
      final failure = mapDioException(
        withResponse(
          400,
          apiError(400, ['Descrição é obrigatória.', 'Prédio é obrigatório.']),
        ),
      );
      expect(failure, isA<ValidationFailure>());
      expect((failure as ValidationFailure).messages, hasLength(2));
      expect(
        failure.message,
        'Descrição é obrigatória.\nPrédio é obrigatório.',
      );
    });

    test('422 -> ValidationFailure com status 422', () {
      final failure = mapDioException(withResponse(422, apiError(422, 'x')));
      expect(failure, isA<ValidationFailure>());
      expect(failure.statusCode, 422);
    });

    test('401 usa a mensagem da API', () {
      final failure = mapDioException(
        withResponse(401, apiError(401, 'Credenciais inválidas.')),
      );
      expect(failure, isA<UnauthorizedFailure>());
      expect(failure.message, 'Credenciais inválidas.');
    });

    test('403 csrfInvalid -> ForbiddenFailure', () {
      final failure = mapDioException(
        withResponse(403, apiError(403, 'Token CSRF inválido.')),
      );
      expect(failure, isA<ForbiddenFailure>());
      expect(failure.message, 'Token CSRF inválido.');
    });

    test('404 mantém o code', () {
      final failure = mapDioException(
        withResponse(404, apiError(404, 'Chamado não encontrado.', code: 'X')),
      );
      expect(failure, isA<NotFoundFailure>());
      expect(failure.code, 'X');
    });

    test('429 -> RateLimitFailure', () {
      expect(
        mapDioException(withResponse(429, apiError(429, 'Muitas tentativas.'))),
        isA<RateLimitFailure>(),
      );
    });

    test('5xx -> ServerFailure com status', () {
      final failure = mapDioException(withResponse(503));
      expect(failure, isA<ServerFailure>());
      expect(failure.statusCode, 503);
      expect(failure.message, AppStrings.errorServer);
    });

    test('409 -> UnknownFailure com a mensagem da API', () {
      final failure = mapDioException(
        withResponse(409, apiError(409, 'Conflito.')),
      );
      expect(failure, isA<UnknownFailure>());
      expect(failure.message, 'Conflito.');
    });

    test('sem message usa o texto padrão', () {
      expect(
        mapDioException(withResponse(401, 'html de proxy')).message,
        AppStrings.errorUnauthorized,
      );
      expect(
        mapDioException(withResponse(400, apiError(400, <String>[]))).message,
        AppStrings.errorValidation,
      );
    });
  });

  test('parseOrFail converte FormatException em UnknownFailure', () {
    expect(parseOrFail(() => 42), 42);
    expect(
      () => parseOrFail<int>(() => throw const FormatException('x')),
      throwsA(isA<UnknownFailure>()),
    );
  });

  test('AppFailure já pronto em error é repassado', () {
    const failure = RateLimitFailure('x');
    expect(
      mapDioException(DioException(requestOptions: options, error: failure)),
      same(failure),
    );
  });
}
