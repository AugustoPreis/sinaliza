import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsDate, IsIn, IsOptional } from 'class-validator';

import { PaginationQueryDTO } from '@shared/dtos/pagination-query.dto';
import { IsArray, IsEnum, IsString, IsUUID, MaxLength } from '@shared/validators';

import { ETicketStatus } from '../enums/ticket-status.enum';

export class SectorTicketQueryDTO extends PaginationQueryDTO {
  @ApiPropertyOptional({ description: 'Restrict to one of the caller-visible sectors' })
  @IsOptional()
  @IsUUID()
  sector_id?: string;

  @ApiPropertyOptional({
    enum: ETicketStatus,
    isArray: true,
    description: 'Comma-separated list, e.g. FORWARDED,IN_PROGRESS',
  })
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

  @ApiPropertyOptional({
    description: 'Matches protocol, description or location (building/environment)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  search?: string;

  // No `sort` field: `created_at` (RB-09's ordering key) is the only
  // sortable column this queue needs, so `order` alone is enough. Default is
  // newest-first — the queue is browsed like a feed, not worked oldest-first.
  @ApiPropertyOptional({ default: 'desc', enum: ['asc', 'desc'] })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  order: 'asc' | 'desc' = 'desc';
}
