import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';

import { PaginationQueryDTO } from '@shared/dtos/pagination-query.dto';
import { IsArray, IsEnum } from '@shared/validators';

import { ETicketStatus } from '../enums/ticket-status.enum';

// `GET /tickets` filters (endpoints-sinaliza.md §8.2). Pagination itself
// stays on this project's own `page`/`perPage` query convention
// (`PaginationQueryDTO`) rather than the doc's `page`/`page_size`, but the
// response body still uses `page`/`page_size` to match the documented
// contract — see `TicketListResponseDTO`.
export class TicketQueryDTO extends PaginationQueryDTO {
  @ApiPropertyOptional({
    enum: ETicketStatus,
    isArray: true,
    description: 'Comma-separated list, e.g. OPEN,FORWARDED,IN_PROGRESS',
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.split(',').map((item) => item.trim()) : value,
  )
  @IsArray()
  @IsEnum(ETicketStatus, { each: true })
  status?: ETicketStatus[];

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  resolved?: boolean;
}
