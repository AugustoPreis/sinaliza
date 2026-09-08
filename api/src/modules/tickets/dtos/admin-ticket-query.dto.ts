import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsDate, IsOptional } from 'class-validator';

import { PaginationQueryDTO } from '@shared/dtos/pagination-query.dto';
import { IsArray, IsEnum, IsString, IsUUID, MaxLength } from '@shared/validators';

import { ETicketStatus } from '../enums/ticket-status.enum';

// Same filter set as `SectorTicketQueryDTO`, minus sector scoping/ordering
// (RB-09's ordering only applies to the sector's own queue).
export class AdminTicketQueryDTO extends PaginationQueryDTO {
  @ApiPropertyOptional()
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
}
