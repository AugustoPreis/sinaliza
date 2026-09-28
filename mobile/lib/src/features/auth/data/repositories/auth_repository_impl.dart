import 'package:mobile/src/core/errors/app_failure.dart';
import 'package:mobile/src/features/auth/data/datasources/auth_remote_datasource.dart';
import 'package:mobile/src/features/auth/domain/repositories/auth_repository.dart';
import 'package:mobile/src/shared/domain/entities/user.dart';

class AuthRepositoryImpl implements AuthRepository {
  AuthRepositoryImpl(this._remote);

  final AuthRemoteDataSource _remote;

  @override
  Future<User> login({required String identifier, required String password}) {
    return _parse(
      () => _remote.login(identifier: identifier, password: password),
    );
  }

  @override
  Future<User> me() => _parse(_remote.me);

  @override
  Future<void> logout() async {
    try {
      await _remote.logout();
    } on AppFailure {
      // Sem rede ou sessão já inválida: o logout local vale do mesmo jeito.
    } finally {
      await _remote.clearSession();
    }
  }

  @override
  Future<void> forgotPassword(String email) => _remote.forgotPassword(email);

  @override
  Future<bool> hasSession() => _remote.hasSession();

  @override
  Future<void> clearSession() => _remote.clearSession();

  /// Payload fora do formato esperado vira [UnknownFailure].
  Future<T> _parse<T>(Future<T> Function() call) async {
    try {
      return await call();
    } on FormatException {
      throw const UnknownFailure();
    }
  }
}
