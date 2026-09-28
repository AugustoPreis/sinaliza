import 'package:flutter/foundation.dart';

/// Configuração por ambiente, injetada em tempo de build via
/// `--dart-define-from-file=env/<ambiente>.json` (ou `--dart-define`).
abstract final class Env {
  /// Nome do ambiente (`dev`, `prod`...). Só informativo.
  static const String name = String.fromEnvironment('ENV', defaultValue: 'dev');

  /// URL base da API já com o prefixo, ex.: `http://10.0.2.2:3000/api/v1`.
  static const String apiBaseUrl = String.fromEnvironment('API_BASE_URL');

  /// Falha cedo se o app foi iniciado sem a configuração obrigatória.
  static void validate() => validateApiBaseUrl(apiBaseUrl);
}

/// Regras de `API_BASE_URL`. Lança [StateError] com a explicação.
void validateApiBaseUrl(String url, {bool isRelease = kReleaseMode}) {
  if (url.isEmpty) {
    throw StateError(
      'API_BASE_URL não definida. Rode com '
      '--dart-define-from-file=env/dev.json (veja mobile/README.md).',
    );
  }
  // Os cookies de sessão são `secure` em produção: sem HTTPS o login
  // "funciona", mas a sessão não é enviada nas chamadas seguintes.
  if (isRelease && !url.startsWith('https://')) {
    throw StateError(
      'Build de release exige API_BASE_URL com https:// (atual: $url).',
    );
  }
}
