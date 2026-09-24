import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsOptional } from 'class-validator';

// No `format` param modeled: xlsx is the only format this endpoint produces.
export class ResearchExportQueryDTO {
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
}
