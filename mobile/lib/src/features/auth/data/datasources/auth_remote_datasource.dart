import 'package:mobile/src/core/network/api_client.dart';
import 'package:mobile/src/core/network/api_paths.dart';
import 'package:mobile/src/core/utils/json.dart';
import 'package:mobile/src/shared/data/models/user_model.dart';
import 'package:mobile/src/shared/domain/entities/user.dart';

/// Chamadas de `/auth/*`. Lança `AppFailure` (via `ApiClient`) ou
/// `FormatException` (payload inesperado).
class AuthRemoteDataSource {
  AuthRemoteDataSource(this._client);

  final ApiClient _client;

  /// `POST /auth/login` `{ identifier, password }` -> `{ user }`.
  /// Os cookies de sessão ficam no jar do `ApiClient`.
  Future<User> login({
    required String identifier,
    required String password,
  }) async {
    final data = await _client.post<Object?>(
      ApiPaths.authLogin,
      data: {'identifier': identifier, 'password': password},
    );
    return UserModel.fromLoginJson(asJson(data));
  }

  Future<User> me() async {
    final data = await _client.get<Object?>(ApiPaths.authMe);
    return UserModel.fromJson(asJson(data));
  }

  Future<void> logout() => _client.post<Object?>(ApiPaths.authLogout);

  /// A API aceita só e-mail (não matrícula). Sempre `204`.
  Future<void> forgotPassword(String email) => _client.post<Object?>(
    ApiPaths.authForgotPassword,
    data: {'email': email},
  );

  Future<bool> hasSession() => _client.hasSession();

  Future<void> clearSession() => _client.clearSession();
}
