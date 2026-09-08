import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsDate, IsIn, IsOptional } from 'class-validator';

import { PaginationQueryDTO } from '@shared/dtos/pagination-query.dto';
import { IsArray, IsEnum, IsString, IsUUID, MaxLength } from '@shared/validators';

import { ETicketStatus } from '../enums/ticket-status.enum';

// `GET /sector/tickets` filters (endpoints-sinaliza.md §10.1). Pagination
// stays on this project's own `page`/`perPage` query convention
// (`PaginationQueryDTO`), same choice already made by `TicketQueryDTO` — see
// its header comment.
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

  @ApiPropertyOptional({ description: 'Matches protocol, description or location (building/environment)' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  search?: string;

  // `sort` isn't a DTO field on purpose: `created_at` (RB-09's own ordering
  // key) is the only sortable column the doc's example shows or that this
  // queue needs, so `order` alone is enough — nothing to route a `sort` value
  // through today.
  @ApiPropertyOptional({ default: 'asc', enum: ['asc', 'desc'] })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  order: 'asc' | 'desc' = 'asc';
}
