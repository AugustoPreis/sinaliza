import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';

import { PaginationQueryDTO } from '@shared/dtos/pagination-query.dto';
import { IsEnum, IsString, IsUUID } from '@shared/validators';

import { EAuditAction } from '../enums/audit-action.enum';

export class AuditLogQueryDTO extends PaginationQueryDTO {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  entityName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  entityUuid?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  actorUuid?: string;

  @ApiPropertyOptional({ enum: EAuditAction })
  @IsOptional()
  @IsEnum(EAuditAction)
  action?: EAuditAction;
}
