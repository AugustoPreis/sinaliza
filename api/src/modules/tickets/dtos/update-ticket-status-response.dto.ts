import { ApiProperty } from '@nestjs/swagger';

import { TicketEntity } from '../entities/ticket.entity';
import { ETicketStatus } from '../enums/ticket-status.enum';

export class UpdateTicketStatusResponseDTO {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  protocol!: string;

  @ApiProperty({ enum: ETicketStatus })
  status!: ETicketStatus;

  @ApiProperty()
  updated_at!: Date;

  static from(ticket: TicketEntity): UpdateTicketStatusResponseDTO {
    const dto = new UpdateTicketStatusResponseDTO();

    dto.id = ticket.uuid;
    dto.protocol = ticket.protocol;
    dto.status = ticket.status;
    dto.updated_at = ticket.updatedAt;

    return dto;
  }
}
