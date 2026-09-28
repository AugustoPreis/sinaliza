import 'package:equatable/equatable.dart';
import 'package:mobile/src/shared/domain/entities/refs.dart';
import 'package:mobile/src/shared/domain/enums/ticket_status.dart';
import 'package:mobile/src/shared/domain/enums/timeline_event_type.dart';

/// Item de `GET /tickets` (lista "Meus chamados").
class TicketListItem extends Equatable {
  const TicketListItem({
    required this.id,
    required this.protocol,
    required this.descriptionSummary,
    required this.currentSector,
    required this.status,
    required this.createdAt,
  });

  final String id;

  /// Ex.: `SIN-1042` (exiba com `ProtocolText`, que adiciona o `#`).
  final String protocol;

  /// Até 140 caracteres, já cortado pela API.
  final String descriptionSummary;
  final SectorRef currentSector;
  final TicketStatus status;
  final DateTime createdAt;

  @override
  List<Object?> get props => [
    id,
    protocol,
    descriptionSummary,
    currentSector,
    status,
    createdAt,
  ];
}

/// Resposta de `POST /tickets` (tela A.5).
class TicketCreated extends Equatable {
  const TicketCreated({
    required this.id,
    required this.protocol,
    required this.status,
    required this.automaticSector,
    required this.confirmedSector,
    required this.currentSector,
    required this.requesterCorrected,
    required this.createdAt,
  });

  final String id;
  final String protocol;
  final TicketStatus status;
  final SectorRef? automaticSector;
  final SectorRef confirmedSector;
  final SectorRef currentSector;

  /// `true` se o solicitante trocou o setor sugerido.
  final bool requesterCorrected;
  final DateTime createdAt;

  @override
  List<Object?> get props => [
    id,
    protocol,
    status,
    automaticSector,
    confirmedSector,
    currentSector,
    requesterCorrected,
    createdAt,
  ];
}

/// Onde o problema está.
class TicketLocation extends Equatable {
  const TicketLocation({required this.building, required this.environment});

  final LocationRef building;
  final LocationRef environment;

  @override
  List<Object?> get props => [building, environment];
}

/// Foto anexada ao chamado.
class TicketPhoto extends Equatable {
  const TicketPhoto({required this.id, required this.url});

  final String id;
  final String url;

  @override
  List<Object?> get props => [id, url];
}

/// Evento da linha do tempo. `description` já vem em pt-BR da API.
class TimelineEvent extends Equatable {
  const TimelineEvent({
    required this.type,
    required this.description,
    required this.createdAt,
  });

  final TimelineEventType type;
  final String description;
  final DateTime createdAt;

  @override
  List<Object?> get props => [type, description, createdAt];
}

/// Resposta de `GET /tickets/{id}` (tela A.6).
///
/// `internal_note` nunca vem para o solicitante e não é modelado.
class TicketDetail extends Equatable {
  const TicketDetail({
    required this.id,
    required this.protocol,
    required this.description,
    required this.location,
    required this.photos,
    required this.status,
    required this.automaticSector,
    required this.confirmedSector,
    required this.currentSector,
    required this.timeline,
  });

  final String id;
  final String protocol;
  final String description;
  final TicketLocation location;
  final List<TicketPhoto> photos;
  final TicketStatus status;
  final SectorRef? automaticSector;
  final SectorRef confirmedSector;
  final SectorRef currentSector;

  /// Em ordem cronológica (mais antigo primeiro), como a API envia.
  final List<TimelineEvent> timeline;

  @override
  List<Object?> get props => [
    id,
    protocol,
    description,
    location,
    photos,
    status,
    automaticSector,
    confirmedSector,
    currentSector,
    timeline,
  ];
}
