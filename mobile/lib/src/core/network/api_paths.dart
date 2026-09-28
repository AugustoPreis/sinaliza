/// Caminhos da API, relativos a `API_BASE_URL` (que já inclui `/api/v1`).
abstract final class ApiPaths {
  static const String authLogin = '/auth/login';
  static const String authRefresh = '/auth/refresh';
  static const String authLogout = '/auth/logout';
  static const String authMe = '/auth/me';
  static const String authForgotPassword = '/auth/forgot-password';
}

/// Nomes de cookies definidos pela API (`auth-cookies.util.ts`).
abstract final class ApiCookies {
  static const String accessToken = 'access_token';
  static const String refreshToken = 'refresh_token';
  static const String xsrfToken = 'XSRF-TOKEN';
}

/// Header do double-submit CSRF (`csrf.guard.ts`).
const String xsrfHeader = 'x-xsrf-token';

/// Chaves de `RequestOptions.extra` usadas pelos interceptors.
abstract final class ApiExtra {
  /// `true` desliga a renovação automática em 401 para esta requisição.
  static const String skipAuthRefresh = 'skipAuthRefresh';

  /// Marcado na repetição após o refresh, para não entrar em loop.
  static const String authRetried = 'authRetried';

  /// Momento de início, usado pelo log de debug.
  static const String startedAt = 'startedAt';
}
