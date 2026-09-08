import { ApiProperty } from '@nestjs/swagger';

import { IsNotEmpty, IsString, IsUUID } from '@shared/validators';

// `reason` is required (RB-07).
export class ReassignTicketDTO {
  @ApiProperty()
  @IsUUID()
  target_sector_id!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  reason!: string;
}
