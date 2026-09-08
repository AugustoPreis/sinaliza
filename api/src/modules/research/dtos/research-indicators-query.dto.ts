import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsOptional } from 'class-validator';

import { IsUUID } from '@shared/validators';

// `GET /admin/research/indicators` filters (endpoints-sinaliza.md §15.1) —
// same filter shape as `AdminDashboardQueryDTO`, minus `status` (the
// research indicators are not scoped by ticket status).
export class ResearchIndicatorsQueryDTO {
  @ApiPropertyOptional({ description: 'Period start (created_at >=), e.g. 2026-08-01' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  from?: Date;

  @ApiPropertyOptional({ description: 'Period end (created_at <=), e.g. 2026-08-31' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  to?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  sector_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  building_id?: string;
}
