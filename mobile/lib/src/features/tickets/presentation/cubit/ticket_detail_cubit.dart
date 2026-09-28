import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:mobile/src/core/errors/app_failure.dart';
import 'package:mobile/src/features/tickets/domain/repositories/tickets_repository.dart';
import 'package:mobile/src/shared/domain/entities/ticket.dart';

sealed class TicketDetailState extends Equatable {
  const TicketDetailState();

  @override
  List<Object?> get props => [];
}

final class TicketDetailLoading extends TicketDetailState {
  const TicketDetailLoading();
}

final class TicketDetailLoaded extends TicketDetailState {
  const TicketDetailLoaded(this.ticket, {this.refreshFailure});

  final TicketDetail ticket;

  /// Pull-to-refresh falhou: o conteúdo continua na tela (aviso pontual).
  final AppFailure? refreshFailure;

  @override
  List<Object?> get props => [ticket, refreshFailure];
}

/// 404 ou 403: não existe ou não é do solicitante.
final class TicketDetailNotFound extends TicketDetailState {
  const TicketDetailNotFound();
}

final class TicketDetailFailure extends TicketDetailState {
  const TicketDetailFailure(this.failure);

  final AppFailure failure;

  @override
  List<Object?> get props => [failure];
}

/// A.6. Sempre busca na API ao abrir (vindo de A.2, A.5, A.7 ou push).
class TicketDetailCubit extends Cubit<TicketDetailState> {
  TicketDetailCubit({
    required TicketsRepository repository,
    required this.ticketId,
  }) : _repository = repository,
       super(const TicketDetailLoading());

  final TicketsRepository _repository;
  final String ticketId;

  Future<void> load() async {
    if (state is! TicketDetailLoading) emit(const TicketDetailLoading());
    await _fetch(keepContent: false);
  }

  /// Pull-to-refresh: mantém o conteúdo visível enquanto recarrega.
  Future<void> refresh() => _fetch(keepContent: true);

  Future<void> _fetch({required bool keepContent}) async {
    final current = state;
    try {
      final ticket = await _repository.getTicket(ticketId);
      if (!isClosed) emit(TicketDetailLoaded(ticket));
    } on NotFoundFailure {
      if (!isClosed) emit(const TicketDetailNotFound());
    } on ForbiddenFailure {
      if (!isClosed) emit(const TicketDetailNotFound());
    } on AppFailure catch (failure) {
      if (isClosed) return;
      emit(
        keepContent && current is TicketDetailLoaded
            ? TicketDetailLoaded(current.ticket, refreshFailure: failure)
            : TicketDetailFailure(failure),
      );
    }
  }
}
