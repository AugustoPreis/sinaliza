import 'dart:io';

import 'package:mobile/src/core/errors/app_failure.dart';
import 'package:mobile/src/core/l10n/app_strings.dart';
import 'package:mobile/src/features/tickets/data/datasources/tickets_remote_datasource.dart';
import 'package:mobile/src/features/tickets/domain/entities/new_ticket_request.dart';
import 'package:mobile/src/features/tickets/domain/repositories/tickets_repository.dart';
import 'package:mobile/src/features/tickets/domain/ticket_filter.dart';
import 'package:mobile/src/shared/domain/entities/paged_result.dart';
import 'package:mobile/src/shared/domain/entities/ticket.dart';

class TicketsRepositoryImpl implements TicketsRepository {
  TicketsRepositoryImpl(this._remote);

  final TicketsRemoteDataSource _remote;

  @override
  Future<PagedResult<TicketListItem>> getMyTickets({
    required TicketFilter filter,
    required int page,
  }) async {
    try {
      return await _remote.fetchMyTickets(
        filter: filter,
        page: page,
        perPage: TicketsRepository.pageSize,
      );
    } on FormatException {
      throw const UnknownFailure();
    }
  }

  @override
  Future<TicketDetail> getTicket(String ticketId) async {
    try {
      return await _remote.fetchTicket(ticketId);
    } on FormatException {
      throw const UnknownFailure();
    }
  }

  @override
  Future<TicketCreated> createTicket(
    NewTicketRequest request, {
    UploadProgress? onProgress,
  }) async {
    try {
      return await _remote.createTicket(
        request,
        onSendProgress: onProgress == null
            ? null
            : (sent, total) {
                if (total > 0) onProgress((sent / total).clamp(0, 1));
              },
      );
    } on FormatException {
      throw const UnknownFailure();
    } on FileSystemException {
      // Foto temporária sumiu (ex.: limpeza do sistema) antes do envio.
      throw const UnknownFailure(AppStrings.confirmPhotoMissing);
    }
  }
}
