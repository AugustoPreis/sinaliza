import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:mobile/src/core/errors/app_failure.dart';
import 'package:mobile/src/features/notifications/domain/repositories/notifications_repository.dart';

/// Quantidade de notificações não lidas (bolinha na aba Notificações).
///
/// Falhas são silenciosas: sem rede, a bolinha só mantém o último valor.
class UnreadNotificationsCubit extends Cubit<int> {
  UnreadNotificationsCubit({required NotificationsRepository repository})
    : _repository = repository,
      super(0);

  final NotificationsRepository _repository;

  /// Cada operação ganha um número; só a mais recente pode emitir (uma
  /// contagem antiga não desfaz um "marcar como lidas" feito depois).
  int _generation = 0;

  Future<void> refresh() async {
    final generation = ++_generation;
    try {
      final count = await _repository.getUnreadCount();
      if (generation == _generation && !isClosed) emit(count);
    } on AppFailure {
      // Mantém o valor atual.
    }
  }

  /// Zera na hora (a pessoa está vendo o histórico) e avisa a API.
  Future<void> markAllRead() async {
    final generation = ++_generation;
    if (state != 0) emit(0);
    try {
      await _repository.markAllRead();
    } on AppFailure {
      // Sem sucesso, a API ainda conta como não lidas: volta ao valor real.
      if (generation == _generation && !isClosed) await refresh();
    }
  }
}
