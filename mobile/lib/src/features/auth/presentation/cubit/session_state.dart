import 'package:equatable/equatable.dart';
import 'package:mobile/src/core/errors/app_failure.dart';
import 'package:mobile/src/shared/domain/entities/user.dart';

/// Estado global da sessão. Cada tipo corresponde a um destino de navegação.
sealed class SessionState extends Equatable {
  const SessionState();

  @override
  List<Object?> get props => [];
}

/// Verificando a sessão (splash).
final class SessionUnknown extends SessionState {
  const SessionUnknown();
}

/// Sessão válida de solicitante -> home.
final class SessionAuthenticated extends SessionState {
  const SessionAuthenticated(this.user);

  final User user;

  @override
  List<Object?> get props => [user];
}

/// Sessão válida, mas a conta não pode abrir chamados (setor/admin).
final class SessionNoAccess extends SessionState {
  const SessionNoAccess(this.user);

  final User user;

  @override
  List<Object?> get props => [user];
}

/// Sem sessão -> login. `message` explica o motivo (ex.: sessão expirou).
final class SessionUnauthenticated extends SessionState {
  const SessionUnauthenticated({this.message});

  final String? message;

  @override
  List<Object?> get props => [message];
}

/// Não foi possível verificar a sessão (sem rede, 5xx). O splash mostra
/// "Tentar novamente", sem mandar para o login à toa.
final class SessionCheckFailed extends SessionState {
  const SessionCheckFailed(this.failure);

  final AppFailure failure;

  @override
  List<Object?> get props => [failure];
}
