import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';

import { PaginationQueryDTO } from '@shared/dtos/pagination-query.dto';
import { IsString } from '@shared/validators';

export class ListRoleDTO extends PaginationQueryDTO {
  @ApiPropertyOptional({
    description: 'Search by role name or description',
  })
  @IsOptional()
  @IsString()
  search?: string;
}
