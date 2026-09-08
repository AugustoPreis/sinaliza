import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsDate, IsOptional } from 'class-validator';

import { IsArray, IsEnum, IsUUID } from '@shared/validators';

import { ETicketStatus } from '../enums/ticket-status.enum';

// `GET /admin/dashboard` filters (endpoints-sinaliza.md §11.2) — all
// optional, no pagination (this endpoint returns a single aggregate object).
export class AdminDashboardQueryDTO {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  sector_id?: string;

  @ApiPropertyOptional({ enum: ETicketStatus, isArray: true })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.split(',').map((item) => item.trim()) : value,
  )
  @IsArray()
  @IsEnum(ETicketStatus, { each: true })
  status?: ETicketStatus[];

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
  building_id?: string;
}
