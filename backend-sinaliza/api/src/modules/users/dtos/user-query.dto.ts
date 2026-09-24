import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';

import { PaginationQueryDTO } from '@shared/dtos/pagination-query.dto';
import { IsEnum, IsString, IsUUID, MaxLength } from '@shared/validators';

import { EUserStatus } from '../enums/user-status.enum';

export class UserQueryDTO extends PaginationQueryDTO {
  @ApiPropertyOptional({ description: 'Filter by name or email (partial match)' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  search?: string;

  @ApiPropertyOptional({ enum: EUserStatus })
  @IsOptional()
  @IsEnum(EUserStatus)
  status?: EUserStatus;

  @ApiPropertyOptional({ description: 'Filter by an assigned role UUID' })
  @IsOptional()
  @IsUUID()
  roleUuid?: string;
}
