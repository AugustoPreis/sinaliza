import 'package:dio/dio.dart';
import 'package:mobile/src/core/errors/app_failure.dart';

/// Converte um [DioException] no [AppFailure] correspondente.
///
/// Formato de erro da API:
/// `{ success: false, statusCode, message: String | String[], code?, path, timestamp }`.
AppFailure mapDioException(DioException exception) {
  final error = exception.error;
  if (error is AppFailure) return error;

  final response = exception.response;

  return switch (exception.type) {
    DioExceptionType.connectionTimeout ||
    DioExceptionType.sendTimeout ||
    DioExceptionType.receiveTimeout ||
    DioExceptionType.connectionError ||
    DioExceptionType.badCertificate => const NetworkFailure(),
    DioExceptionType.cancel => const UnknownFailure(),
    // Sem resposta: socket caiu no meio da requisição.
    DioExceptionType.unknown when response == null => const NetworkFailure(),
    DioExceptionType.badResponse when response == null =>
      const UnknownFailure(),
    DioExceptionType.unknown ||
    DioExceptionType.badResponse => _fromResponse(response!),
  };
}

/// Converte o payload com [parse]. Payload fora do formato esperado
/// (`FormatException` dos modelos) vira [UnknownFailure], para que os
/// repositórios só lancem [AppFailure].
T parseOrFail<T>(T Function() parse) {
  try {
    return parse();
  } on FormatException {
    throw const UnknownFailure();
  }
}

AppFailure _fromResponse(Response<dynamic> response) {
  final status = response.statusCode ?? 0;
  final body = response.data;
  final messages = _messages(body);
  final message = messages.isEmpty ? null : messages.join('\n');
  final code = body is Map && body['code'] is String
      ? body['code'] as String
      : null;

  return switch (status) {
    400 || 422 => ValidationFailure(messages, statusCode: status, code: code),
    401 => UnauthorizedFailure(message, code),
    403 => ForbiddenFailure(message, code),
    404 => NotFoundFailure(message, code),
    429 => RateLimitFailure(message),
    >= 500 => ServerFailure(message, status),
    _ => UnknownFailure(message, status, code),
  };
}

List<String> _messages(Object? body) {
  if (body is! Map) return const [];
  final message = body['message'];
  if (message is String && message.trim().isNotEmpty) return [message];
  if (message is List) {
    return message
        .whereType<String>()
        .where((m) => m.trim().isNotEmpty)
        .toList();
  }
  return const [];
}
