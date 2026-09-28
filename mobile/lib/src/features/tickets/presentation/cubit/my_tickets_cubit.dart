import 'package:mobile/src/core/pagination/paged_list_cubit.dart';
import 'package:mobile/src/features/tickets/domain/repositories/tickets_repository.dart';
import 'package:mobile/src/features/tickets/domain/ticket_filter.dart';
import 'package:mobile/src/shared/domain/entities/paged_result.dart';
import 'package:mobile/src/shared/domain/entities/ticket.dart';

export 'package:mobile/src/core/pagination/paged_list_cubit.dart';

typedef MyTicketsState = PagedListState<TicketListItem>;
typedef MyTicketsStatus = PagedListStatus;

/// Lista de uma aba da A.2 ([filter]). Um cubit por aba mantém cada lista
/// ao trocar de aba, sem recarregar.
class MyTicketsCubit extends PagedListCubit<TicketListItem> {
  MyTicketsCubit({required TicketsRepository repository, required this.filter})
    : _repository = repository;

  final TicketsRepository _repository;
  final TicketFilter filter;

  @override
  Future<PagedResult<TicketListItem>> fetchPage(int page) =>
      _repository.getMyTickets(filter: filter, page: page);

  @override
  String idOf(TicketListItem item) => item.id;
}
