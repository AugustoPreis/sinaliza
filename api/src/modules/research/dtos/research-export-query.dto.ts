import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsOptional } from 'class-validator';

// `GET /admin/research/export` filters (endpoints-sinaliza.md §15.2). The
// doc also lists an optional `?format=xlsx`, but xlsx is the only format
// this endpoint ever produces, so there is nothing for that query param to
// select between — it's intentionally not modeled here.
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
