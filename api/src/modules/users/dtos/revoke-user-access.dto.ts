import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';

import { IsString, MaxLength } from '@shared/validators';

export class RevokeUserAccessDTO {
  @ApiPropertyOptional({ description: 'Optional audit note for why access was revoked' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
