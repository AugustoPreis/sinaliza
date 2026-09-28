import 'package:mobile/src/shared/domain/entities/user.dart';

/// Autenticação do solicitante. Todos os métodos lançam só `AppFailure`.
abstract interface class AuthRepository {
  Future<User> login({required String identifier, required String password});

  /// Usuário da sessão atual (`GET /auth/me`). Renova o token se preciso.
  Future<User> me();

  /// Encerra a sessão no servidor e apaga os cookies locais, mesmo se a
  /// chamada falhar (sem rede, sessão já expirada).
  Future<void> logout();

  Future<void> forgotPassword(String email);

  /// Há sessão salva no aparelho? Não faz requisição.
  Future<bool> hasSession();

  /// Apaga a sessão local sem chamar a API.
  Future<void> clearSession();
}
