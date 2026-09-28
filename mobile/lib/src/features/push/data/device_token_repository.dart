import 'package:mobile/src/core/network/api_client.dart';
import 'package:mobile/src/features/push/domain/push_messaging.dart';

/// `POST/DELETE /devices/push-token`. Lança só `AppFailure`.
class DeviceTokenRepository {
  DeviceTokenRepository(this._client);

  final ApiClient _client;

  static const path = '/devices/push-token';

  /// Associa o token ao usuário logado (a API faz upsert).
  Future<void> register(String token, PushPlatform platform) =>
      _client.post<Object?>(
        path,
        data: {'token': token, 'platform': platform.apiValue},
      );

  /// Desassocia o token (logout). Precisa da sessão ainda válida.
  Future<void> remove(String token) =>
      _client.delete<Object?>(path, data: {'token': token});
}
