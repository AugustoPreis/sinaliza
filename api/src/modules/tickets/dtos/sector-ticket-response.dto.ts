import { ApiProperty } from '@nestjs/swagger';

import { IPaginatedResult } from '@shared/interfaces';

import { TicketEntity } from '../entities/ticket.entity';
import { ETicketStatus } from '../enums/ticket-status.enum';

const DESCRIPTION_SUMMARY_MAX_LENGTH = 140;

// `GET /sector/tickets` item shape (endpoints-sinaliza.md §10.1) — note this
// is deliberately different from `TicketListItemResponseDTO` (§8.2, the
// requester's own list): here `automatic_sector_id`/`confirmed_sector_id`
// are flat sector uuids plus `classification_diverged`, not a `current_sector`
// ref object, matching the doc's example exactly.
export class SectorTicketListItemResponseDTO {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  protocol!: string;

  @ApiProperty()
  description_summary!: string;

  @ApiProperty()
  location!: string;

  @ApiProperty({ enum: ETicketStatus })
  status!: ETicketStatus;

  @ApiProperty()
  automatic_sector_id!: string;

  @ApiProperty()
  confirmed_sector_id!: string;

  @ApiProperty()
  classification_diverged!: boolean;

  @ApiProperty()
  created_at!: Date;

  static from(ticket: TicketEntity): SectorTicketListItemResponseDTO {
    const dto = new SectorTicketListItemResponseDTO();

    dto.id = ticket.uuid;
    dto.protocol = ticket.protocol;
    dto.description_summary = summarize(ticket.description);
    dto.location = `${ticket.building.name} / ${ticket.environment.name}`;
    dto.status = ticket.status;
    dto.automatic_sector_id = ticket.automaticSector.uuid;
    dto.confirmed_sector_id = ticket.confirmedSector.uuid;
    // RB-05/RB-06 aside: this is the research signal itself (see the
    // documentation's "Visão Geral"/§18) — true whenever the requester's
    // final decision (Tela A.4) departed from the automatic suggestion.
    dto.classification_diverged = ticket.automaticSectorId !== ticket.confirmedSectorId;
    dto.created_at = ticket.createdAt;

    return dto;
  }
}

// Same `items`/`page`/`page_size`/`total` envelope choice as
// `TicketListResponseDTO` — the functional doc's payload contract wins over
// this project's generic `{data, meta}` pagination envelope.
export class SectorTicketListResponseDTO {
  @ApiProperty({ type: [SectorTicketListItemResponseDTO] })
  items!: SectorTicketListItemResponseDTO[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  page_size!: number;

  @ApiProperty()
  total!: number;

  static from(result: IPaginatedResult<TicketEntity>): SectorTicketListResponseDTO {
    const dto = new SectorTicketListResponseDTO();

    dto.items = result.data.map((ticket) => SectorTicketListItemResponseDTO.from(ticket));
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
