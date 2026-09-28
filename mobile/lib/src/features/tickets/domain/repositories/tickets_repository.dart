import 'package:mobile/src/features/tickets/domain/entities/new_ticket_request.dart';
import 'package:mobile/src/features/tickets/domain/ticket_filter.dart';
import 'package:mobile/src/shared/domain/entities/paged_result.dart';
import 'package:mobile/src/shared/domain/entities/ticket.dart';

/// Progresso do envio, de 0 a 1.
typedef UploadProgress = void Function(double progress);

/// Chamados do solicitante. Lança só `AppFailure`.
abstract interface class TicketsRepository {
  /// Tamanho de página usado pelo app (a API usa 5 se não for informado).
  static const int pageSize = 20;

  /// Página [page] (começa em 1) dos chamados do usuário, mais recentes primeiro.
  Future<PagedResult<TicketListItem>> getMyTickets({
    required TicketFilter filter,
    required int page,
  });

  /// Detalhe do chamado (sempre busca na API).
  Future<TicketDetail> getTicket(String ticketId);

  /// Cria o chamado (`POST /tickets`). [onProgress] informa o envio das fotos.
  Future<TicketCreated> createTicket(
    NewTicketRequest request, {
    UploadProgress? onProgress,
  });
}
