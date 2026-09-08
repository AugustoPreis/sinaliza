import { ApiProperty } from '@nestjs/swagger';

import { IPaginatedResult } from '@shared/interfaces';

import { TicketEntity } from '../entities/ticket.entity';
import { ETicketStatus } from '../enums/ticket-status.enum';

import { SectorRefDTO } from './sector-ref.dto';

// How long `description_summary` (endpoints-sinaliza.md §8.2) is allowed to
// be before it's truncated with an ellipsis — not specified by the doc, a
// reasonable implementation choice for a list row.
const DESCRIPTION_SUMMARY_MAX_LENGTH = 140;

export class TicketListItemResponseDTO {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  protocol!: string;

  @ApiProperty()
  description_summary!: string;

  @ApiProperty({ type: SectorRefDTO })
  current_sector!: SectorRefDTO;

  @ApiProperty({ enum: ETicketStatus })
  status!: ETicketStatus;

  @ApiProperty()
  created_at!: Date;

  static from(ticket: TicketEntity): TicketListItemResponseDTO {
    const dto = new TicketListItemResponseDTO();

    dto.id = ticket.uuid;
    dto.protocol = ticket.protocol;
    dto.description_summary = summarize(ticket.description);
    dto.current_sector = SectorRefDTO.from(ticket.currentSector);
    dto.status = ticket.status;
    dto.created_at = ticket.createdAt;

    return dto;
  }
}

// `GET /tickets` response envelope. Deliberately shaped exactly as
// endpoints-sinaliza.md §8.2 documents it (`items`/`page`/`page_size`/`total`)
// instead of this project's generic `{data, meta}` pagination envelope
// (`PaginatedResponseDTO`) — the functional doc is the payload contract of
// record for this endpoint, so its shape wins over the internal convention.
export class TicketListResponseDTO {
  @ApiProperty({ type: [TicketListItemResponseDTO] })
  items!: TicketListItemResponseDTO[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  page_size!: number;

  @ApiProperty()
  total!: number;

  static from(result: IPaginatedResult<TicketEntity>): TicketListResponseDTO {
    const dto = new TicketListResponseDTO();

    dto.items = result.data.map((ticket) => TicketListItemResponseDTO.from(ticket));
    dto.page = result.meta.page;
    dto.page_size = result.meta.perPage;
    dto.total = result.meta.total;

    return dto;
  }
}

function summarize(description: string): string {
  if (description.length <= DESCRIPTION_SUMMARY_MAX_LENGTH) return description;

  return `${description.slice(0, DESCRIPTION_SUMMARY_MAX_LENGTH - 1).trimEnd()}…`;
}
