import 'dart:async';

/// Eventos de sessão emitidos pela camada de rede.
sealed class SessionEvent {
  const SessionEvent();
}

/// O refresh falhou (refresh token ausente, inválido ou revogado). O jar de
/// cookies já foi limpo; a UI deve voltar para o login (task 05).
final class SessionExpired extends SessionEvent {
  const SessionExpired();
}

/// Uma sessão ativa terminou (logout, expiração ou conta revogada). Emitido
/// pelo `SessionCubit`; caches com dados do usuário devem ser limpos.
final class SessionEnded extends SessionEvent {
  const SessionEnded();
}

/// Canal de eventos de sessão, registrado como singleton no `get_it`.
class SessionEventBus {
  final StreamController<SessionEvent> _controller =
      StreamController<SessionEvent>.broadcast();

  Stream<SessionEvent> get events => _controller.stream;

  void emit(SessionEvent event) {
    if (!_controller.isClosed) _controller.add(event);
  }

  Future<void> dispose() => _controller.close();
}
