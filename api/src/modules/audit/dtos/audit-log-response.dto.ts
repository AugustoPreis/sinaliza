import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { AuditFieldChangeDTO } from '@shared/audit/dtos/audit-field-change.dto';

import { EAuditAction } from '../enums/audit-action.enum';

export class AuditLogResponseDTO {
  @ApiProperty()
  uuid!: string;

  @ApiProperty()
  entityName!: string;

  @ApiProperty()
  entityLabel!: string;

  @ApiProperty()
  entityUuid!: string;

  @ApiProperty({ enum: EAuditAction })
  action!: EAuditAction;

  @ApiPropertyOptional({ nullable: true })
  actorUuid!: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty({ type: [AuditFieldChangeDTO] })
  changes!: AuditFieldChangeDTO[];

  /**
   * No synchronous `static from()` here on purpose: assembling this DTO
   * requires resolving relations, translating and formatting, which is async
   * (`AuditPipelineService.buildChangeSet`). That assembly happens in
   * `AuditLogResponseMapper` instead.
   */
}
