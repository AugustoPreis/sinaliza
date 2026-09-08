import { ApiProperty } from '@nestjs/swagger';

import { SectorEntity } from '@modules/sectors/entities/sector.entity';

import { TicketEntity } from '../entities/ticket.entity';
import { ETicketStatus } from '../enums/ticket-status.enum';

import { SectorRefDTO } from './sector-ref.dto';

export class TicketResponseDTO {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  protocol!: string;

  @ApiProperty({ enum: ETicketStatus })
  status!: ETicketStatus;

  @ApiProperty({ type: SectorRefDTO })
  automatic_sector!: SectorRefDTO;

  @ApiProperty({ type: SectorRefDTO })
  confirmed_sector!: SectorRefDTO;

  @ApiProperty({ type: SectorRefDTO })
  current_sector!: SectorRefDTO;

  @ApiProperty()
  requester_corrected!: boolean;

  @ApiProperty()
  created_at!: Date;

  static from(
    ticket: TicketEntity,
    automaticSector: SectorEntity,
    confirmedSector: SectorEntity,
    currentSector: SectorEntity,
  ): TicketResponseDTO {
    const dto = new TicketResponseDTO();

    dto.id = ticket.uuid;
    dto.protocol = ticket.protocol;
    dto.status = ticket.status;
    dto.automatic_sector = SectorRefDTO.from(automaticSector);
    dto.confirmed_sector = SectorRefDTO.from(confirmedSector);
    dto.current_sector = SectorRefDTO.from(currentSector);
    dto.requester_corrected = ticket.requesterCorrected;
    dto.created_at = ticket.createdAt;

    return dto;
  }
}
