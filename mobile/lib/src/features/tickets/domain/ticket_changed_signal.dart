import 'dart:async';

/// Avisa que um chamado mudou (ex.: push recebido com o app aberto), para
/// o detalhe (A.6) daquele chamado recarregar se estiver na tela.
class TicketChangedSignal {
  final StreamController<String> _controller =
      StreamController<String>.broadcast();

  /// Emite o `id` do chamado que mudou.
  Stream<String> get stream => _controller.stream;

  void notify(String ticketId) {
    if (!_controller.isClosed) _controller.add(ticketId);
  }

  Future<void> dispose() => _controller.close();
}
