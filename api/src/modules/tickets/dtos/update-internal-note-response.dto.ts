import { ApiProperty } from '@nestjs/swagger';

import { TicketEntity } from '../entities/ticket.entity';

// `PATCH /tickets/{ticketId}/internal-note` response shape
// (endpoints-sinaliza.md §10.4).
export class UpdateInternalNoteResponseDTO {
  @ApiProperty()
  success!: boolean;

  @ApiProperty()
  updated_at!: Date;

  static from(ticket: TicketEntity): UpdateInternalNoteResponseDTO {
    const dto = new UpdateInternalNoteResponseDTO();

    dto.success = true;
    dto.updated_at = ticket.updatedAt;

    return dto;
  }
}
