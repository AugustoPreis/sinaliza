import 'package:mobile/src/core/l10n/app_strings.dart';

/// Erro único que sobe das camadas de dados para os cubits.
///
/// `message` já vem pronta para exibir: é a mensagem da API (traduzida pelo
/// backend via `Accept-Language`) ou um texto padrão em pt-BR.
sealed class AppFailure implements Exception {
  const AppFailure(this.message, {this.statusCode, this.code});

  final String message;
  final int? statusCode;

  /// Código opcional enviado pela API (`code`).
  final String? code;

  @override
  String toString() => '$runtimeType($statusCode, $message)';
}

/// Sem conexão, DNS, timeout ou certificado inválido.
final class NetworkFailure extends AppFailure {
  const NetworkFailure([String? message])
    : super(message ?? AppStrings.errorNetwork);
}

/// 401: credenciais inválidas ou sessão expirada.
final class UnauthorizedFailure extends AppFailure {
  const UnauthorizedFailure([String? message, String? code])
    : super(
        message ?? AppStrings.errorUnauthorized,
        statusCode: 401,
        code: code,
      );
}

/// 403: sem permissão, incluindo `csrfInvalid`.
final class ForbiddenFailure extends AppFailure {
  const ForbiddenFailure([String? message, String? code])
    : super(message ?? AppStrings.errorForbidden, statusCode: 403, code: code);
}

/// 404.
final class NotFoundFailure extends AppFailure {
  const NotFoundFailure([String? message, String? code])
    : super(message ?? AppStrings.errorNotFound, statusCode: 404, code: code);
}

/// 400/422: dados inválidos. `messages` traz uma mensagem por campo/regra.
final class ValidationFailure extends AppFailure {
  ValidationFailure(this.messages, {int statusCode = 400, String? code})
    : super(
        messages.isEmpty ? AppStrings.errorValidation : messages.join('\n'),
        statusCode: statusCode,
        code: code,
      );

  final List<String> messages;
}

/// 429: limite de tentativas (login e esqueci minha senha).
final class RateLimitFailure extends AppFailure {
  const RateLimitFailure([String? message])
    : super(message ?? AppStrings.errorRateLimit, statusCode: 429);
}

/// 5xx.
final class ServerFailure extends AppFailure {
  const ServerFailure([String? message, int statusCode = 500])
    : super(message ?? AppStrings.errorServer, statusCode: statusCode);
}

/// Dados obrigatórios não cadastrados no servidor (ex.: nenhum prédio ou
/// setor). Não adianta tentar de novo: a administração precisa cadastrar.
final class ConfigurationFailure extends AppFailure {
  const ConfigurationFailure(super.message);
}

/// Qualquer outro caso (4xx não mapeado, cancelamento, resposta inesperada).
final class UnknownFailure extends AppFailure {
  const UnknownFailure([String? message, int? statusCode, String? code])
    : super(
        message ?? AppStrings.errorUnknown,
        statusCode: statusCode,
        code: code,
      );
}
