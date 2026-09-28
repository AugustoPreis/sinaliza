import 'package:mobile/src/core/utils/json.dart';
import 'package:mobile/src/shared/data/models/reference_models.dart';
import 'package:mobile/src/shared/domain/entities/ticket.dart';
import 'package:mobile/src/shared/domain/enums/ticket_status.dart';
import 'package:mobile/src/shared/domain/enums/timeline_event_type.dart';

// DTOs de chamados usam snake_case.

abstract final class TicketListItemModel {
  static TicketListItem fromJson(Json json) {
    return TicketListItem(
      id: json.str('id'),
      protocol: json.str('protocol'),
      descriptionSummary: json.str('description_summary'),
      currentSector: SectorRefModel.fromJson(json.obj('current_sector')),
      status: TicketStatus.fromApi(json.strOrNull('status')),
      createdAt: json.date('created_at'),
    );
  }
}

abstract final class TicketCreatedModel {
  static TicketCreated fromJson(Json json) {
    return TicketCreated(
      id: json.str('id'),
      protocol: json.str('protocol'),
      status: TicketStatus.fromApi(json.strOrNull('status')),
      automaticSector: SectorRefModel.fromJson(json.obj('automatic_sector')),
      confirmedSector: SectorRefModel.fromJson(json.obj('confirmed_sector')),
      currentSector: SectorRefModel.fromJson(json.obj('current_sector')),
      requesterCorrected: json.boolean('requester_corrected'),
      createdAt: json.date('created_at'),
    );
  }
}

abstract final class TimelineEventModel {
  static TimelineEvent fromJson(Json json) {
    return TimelineEvent(
      type: TimelineEventType.fromApi(json.strOrNull('type')),
      description: json.strOrNull('description') ?? '',
      createdAt: json.date('created_at'),
    );
  }
}

abstract final class TicketDetailModel {
  static TicketDetail fromJson(Json json) {
    final location = json.obj('location');
    return TicketDetail(
      id: json.str('id'),
      protocol: json.str('protocol'),
      description: json.str('description'),
      location: TicketLocation(
        building: LocationRefModel.fromJson(location.obj('building')),
        environment: LocationRefModel.fromJson(location.obj('environment')),
      ),
      photos: json.list(
        'photos',
        (photo) => TicketPhoto(id: photo.str('id'), url: photo.str('url')),
      ),
      status: TicketStatus.fromApi(json.strOrNull('status')),
      automaticSector: SectorRefModel.fromJson(json.obj('automatic_sector')),
      confirmedSector: SectorRefModel.fromJson(json.obj('confirmed_sector')),
      currentSector: SectorRefModel.fromJson(json.obj('current_sector')),
      timeline: json.list('timeline', TimelineEventModel.fromJson),
    );
  }
}
