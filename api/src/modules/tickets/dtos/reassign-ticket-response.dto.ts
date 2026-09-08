import { ApiProperty } from '@nestjs/swagger';

import { SectorEntity } from '@modules/sectors/entities/sector.entity';

import { TicketEntity } from '../entities/ticket.entity';
import { ETicketStatus } from '../enums/ticket-status.enum';

import { SectorRefDTO } from './sector-ref.dto';

// `POST /tickets/{ticketId}/reassign` response shape (endpoints-sinaliza.md
// §10.3).
export class ReassignTicketResponseDTO {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  protocol!: string;

  @ApiProperty({ enum: ETicketStatus })
  status!: ETicketStatus;

  @ApiProperty({ type: SectorRefDTO })
  previous_sector!: SectorRefDTO;

  @ApiProperty({ type: SectorRefDTO })
  current_sector!: SectorRefDTO;

  @ApiProperty()
  reclassified_at!: Date;

  static from(
    ticket: TicketEntity,
    previousSector: SectorEntity,
    currentSector: SectorEntity,
    reclassifiedAt: Date,
  ): ReassignTicketResponseDTO {
    const dto = new ReassignTicketResponseDTO();

    dto.id = ticket.uuid;
    dto.protocol = ticket.protocol;
    dto.status = ticket.status;
    dto.previous_sector = SectorRefDTO.from(previousSector);
    dto.current_sector = SectorRefDTO.from(currentSector);
    dto.reclassified_at = reclassifiedAt;

    return dto;
  }
}
