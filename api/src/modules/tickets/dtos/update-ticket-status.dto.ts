import { ApiProperty } from '@nestjs/swagger';

import { IsEnum } from '@shared/validators';

import { ETicketStatusTransition } from '../enums/ticket-status-transition.enum';

// Only `IN_PROGRESS`/`RESOLVED` are accepted - see
// `ETicketStatusTransition`'s header comment (RB-10).
export class UpdateTicketStatusDTO {
  @ApiProperty({ enum: ETicketStatusTransition })
  @IsEnum(ETicketStatusTransition)
  status!: ETicketStatusTransition;
}
