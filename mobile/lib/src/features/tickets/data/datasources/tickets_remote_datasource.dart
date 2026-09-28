import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:mobile/src/core/network/api_client.dart';
import 'package:mobile/src/core/utils/json.dart';
import 'package:mobile/src/features/tickets/domain/entities/new_ticket_request.dart';
import 'package:mobile/src/features/tickets/domain/ticket_filter.dart';
import 'package:mobile/src/shared/data/models/paged_result_model.dart';
import 'package:mobile/src/shared/data/models/ticket_models.dart';
import 'package:mobile/src/shared/domain/entities/paged_result.dart';
import 'package:mobile/src/shared/domain/entities/ticket.dart';

/// Chamados do solicitante. Lança `AppFailure` ou `FormatException`.
class TicketsRemoteDataSource {
  TicketsRemoteDataSource(this._client);

  final ApiClient _client;

  static const ticketsPath = '/tickets';

  /// Envio com fotos pode demorar em redes móveis.
  static const uploadTimeout = Duration(seconds: 60);

  /// `GET /tickets?page=&perPage=&status=`. A API já limita aos chamados do
  /// usuário autenticado e ordena do mais recente para o mais antigo.
  ///
  /// A query usa `perPage` (default da API: 5), mas a resposta traz
  /// `page_size`.
  Future<PagedResult<TicketListItem>> fetchMyTickets({
    required TicketFilter filter,
    required int page,
    required int perPage,
  }) async {
    final status = filter.queryValue;
    final data = await _client.get<Object?>(
      ticketsPath,
      queryParameters: {'page': page, 'perPage': perPage, 'status': ?status},
    );
    return PagedResultModel.fromJson(
      asJson(data),
      TicketListItemModel.fromJson,
    );
  }

  /// `GET /tickets/{id}`: dados, fotos e linha do tempo. A API só devolve
  /// chamados do próprio solicitante (403/404 nos demais) e nunca envia
  /// `internal_note` para ele.
  Future<TicketDetail> fetchTicket(String ticketId) async {
    final data = await _client.get<Object?>(
      '$ticketsPath/${Uri.encodeComponent(ticketId)}',
    );
    return TicketDetailModel.fromJson(asJson(data));
  }

  /// `POST /tickets` em `multipart/form-data` (nomes de `create-ticket.dto.ts`).
  ///
  /// `location` vai como string JSON; cada foto repete o campo `photos`. O
  /// `Content-Type` com o boundary é gerado pelo Dio (não fixar).
  Future<TicketCreated> createTicket(
    NewTicketRequest request, {
    ProgressCallback? onSendProgress,
  }) async {
    final form = FormData()
      ..fields.addAll([
        MapEntry('description', request.description),
        MapEntry(
          'location',
          jsonEncode({
            'building_id': request.buildingId,
            'environment_id': request.environmentId,
          }),
        ),
        if (request.automaticSectorId != null)
          MapEntry('automatic_sector_id', request.automaticSectorId!),
        MapEntry('confirmed_sector_id', request.confirmedSectorId),
      ]);

    for (final (index, photo) in request.photos.indexed) {
      form.files.add(
        MapEntry(
          'photos',
          await MultipartFile.fromFile(
            photo.path,
            filename: 'foto_${index + 1}.jpg',
            contentType: DioMediaType.parse(photo.mimeType),
          ),
        ),
      );
    }

    final data = await _client.post<Object?>(
      ticketsPath,
      data: form,
      onSendProgress: onSendProgress,
      options: Options(
        sendTimeout: uploadTimeout,
        receiveTimeout: uploadTimeout,
      ),
    );
    return TicketCreatedModel.fromJson(asJson(data));
  }
}
