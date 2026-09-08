import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';

import { IsUUID } from '@shared/validators';

export class LocationQueryDTO {
  @ApiPropertyOptional({ description: 'Filter to a single building' })
  @IsOptional()
  @IsUUID()
  building_id?: string;
}
