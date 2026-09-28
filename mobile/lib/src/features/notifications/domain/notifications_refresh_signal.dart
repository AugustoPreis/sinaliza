import 'dart:async';

/// Avisa a tela de notificações que há novidade (ex.: push recebido com o
/// app em primeiro plano, task 15), para recarregar o histórico.
class NotificationsRefreshSignal {
  final StreamController<void> _controller = StreamController<void>.broadcast();

  Stream<void> get stream => _controller.stream;

  void notify() {
    if (!_controller.isClosed) _controller.add(null);
  }

  Future<void> dispose() => _controller.close();
}
