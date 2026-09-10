import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { TicketEventEntity } from '../entities/ticket-event.entity';
import { TicketEntity } from '../entities/ticket.entity';
import { ETicketEventType } from '../enums/ticket-event-type.enum';
import { ETicketStatus } from '../enums/ticket-status.enum';

import { SectorRefDTO } from './sector-ref.dto';

const STATUS_LABELS: Record<ETicketStatus, string> = {
  [ETicketStatus.OPEN]: 'Aberto',
  [ETicketStatus.FORWARDED]: 'Encaminhado',
  [ETicketStatus.IN_PROGRESS]: 'Em andamento',
  [ETicketStatus.RESOLVED]: 'Resolvido',
};

export class LocationRefDTO {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  static from(entity: { uuid: string; name: string }): LocationRefDTO {
    const dto = new LocationRefDTO();

    dto.id = entity.uuid;
    dto.name = entity.name;

    return dto;
  }
}

export class TicketLocationDTO {
  @ApiProperty({ type: LocationRefDTO })
  building!: LocationRefDTO;

  @ApiProperty({ type: LocationRefDTO })
  environment!: LocationRefDTO;
}

export class TicketPhotoResponseDTO {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  url!: string;
}

export class TicketTimelineEventDTO {
  @ApiProperty({ enum: ETicketEventType })
  type!: ETicketEventType;

  @ApiProperty()
  description!: string;

  @ApiProperty()
  created_at!: Date;

  static from(event: TicketEventEntity): TicketTimelineEventDTO {
    const dto = new TicketTimelineEventDTO();

    dto.type = event.type;
    dto.description = describeEvent(event);
    dto.created_at = event.createdAt;

    return dto;
  }
}

export class TicketDetailResponseDTO {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  protocol!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty({ type: TicketLocationDTO })
  location!: TicketLocationDTO;

  @ApiProperty({ type: [TicketPhotoResponseDTO] })
  photos!: TicketPhotoResponseDTO[];

  @ApiProperty({ enum: ETicketStatus })
  status!: ETicketStatus;

  @ApiProperty({ type: SectorRefDTO })
  automatic_sector!: SectorRefDTO;

  @ApiProperty({ type: SectorRefDTO })
  confirmed_sector!: SectorRefDTO;

  @ApiProperty({ type: SectorRefDTO })
  current_sector!: SectorRefDTO;

  @ApiProperty({ type: [TicketTimelineEventDTO] })
  timeline!: TicketTimelineEventDTO[];

  // Omitted from the response entirely (not just `null`) when the caller is
  // the requester - see `includeInternalNote` below and `GetTicketUseCase`.
  @ApiPropertyOptional()
  internal_note?: string | null;

  static from(
    ticket: TicketEntity,
    resolvePhotoUrl: (storageKey: string) => string,
    includeInternalNote = false,
  ): TicketDetailResponseDTO {
    const dto = new TicketDetailResponseDTO();

    dto.id = ticket.uuid;
    dto.protocol = ticket.protocol;
    dto.description = ticket.description;
    dto.location = {
      building: LocationRefDTO.from(ticket.building),
      environment: LocationRefDTO.from(ticket.environment),
    };
    dto.photos = (ticket.photos ?? []).map((photo) => ({
      id: photo.uuid,
      url: resolvePhotoUrl(photo.storageKey),
    }));
    dto.status = ticket.status;
    dto.automatic_sector = SectorRefDTO.from(ticket.automaticSector);
    dto.confirmed_sector = SectorRefDTO.from(ticket.confirmedSector);
    dto.current_sector = SectorRefDTO.from(ticket.currentSector);
    dto.timeline = (ticket.events ?? [])
      .slice()
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map((event) => TicketTimelineEventDTO.from(event));

    if (includeInternalNote) {
      dto.internal_note = ticket.internalNote;
    }

    return dto;
  }
}

// Rendered from the event's structured fields rather than stored redundantly
// on the row itself.
function describeEvent(event: TicketEventEntity): string {
  switch (event.type) {
    case ETicketEventType.TICKET_OPENED:
      return 'Chamado aberto.';
    case ETicketEventType.AUTO_CLASSIFIED:
      return `Classificado automaticamente para ${event.toSector?.name ?? 'setor desconhecido'}.`;
    case ETicketEventType.REQUESTER_CONFIRMED_SECTOR:
      return `Solicitante confirmou o setor ${event.toSector?.name ?? 'sugerido'}.`;
    case ETicketEventType.REQUESTER_CHANGED_SECTOR:
      return `Solicitante alterou o setor sugerido para ${event.toSector?.name ?? 'outro setor'}.`;
    case ETicketEventType.STATUS_CHANGED:
      return `Chamado alterado para ${event.toStatus ? STATUS_LABELS[event.toStatus] : 'novo status'}.`;
    case ETicketEventType.REASSIGNED:
      return `Redirecionado para ${event.toSector?.name ?? 'outro setor'}${event.reason ? `: ${event.reason}` : ''}.`;
    case ETicketEventType.TICKET_RESOLVED:
      return 'Chamado resolvido.';
    default:
      return '';
  }
}
