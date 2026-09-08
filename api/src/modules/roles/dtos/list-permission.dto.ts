import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';

import { PaginationQueryDTO } from '@shared/dtos/pagination-query.dto';
import { IsString } from '@shared/validators';

export class ListPermissionDTO extends PaginationQueryDTO {
  @ApiPropertyOptional({
    description: 'Search by resource',
  })
  @IsOptional()
  @IsString()
  resource?: string;
}
