import { Injectable } from '@nestjs/common';

import { AuditPipelineService } from '@shared/audit/pipeline/audit-pipeline.service';

import { AuditLogResponseDTO } from '../dtos/audit-log-response.dto';
import { AuditLogEntity } from '../entities/audit-log.entity';

/**
 * Centralizes `AuditLogEntity` -> `AuditLogResponseDTO` assembly so
 * `ListAuditLogsUseCase` and `FindAuditLogUseCase` don't each duplicate it.
 * Not a static `DTO.from()` (the project's usual convention) because
 * assembly needs the injected `AuditPipelineService` to resolve relations,
 * translate labels and format values.
 */
@Injectable()
export class AuditLogResponseMapper {
  constructor(private readonly auditPipelineService: AuditPipelineService) {}

  async toResponseDTO(log: AuditLogEntity, locale: string): Promise<AuditLogResponseDTO> {
    const dto = new AuditLogResponseDTO();

    dto.uuid = log.uuid;
    dto.entityName = log.entityName;
    dto.entityLabel = this.auditPipelineService.resolveEntityLabel(log.entityName, locale);
    dto.entityUuid = log.entityUuid;
    dto.action = log.action;
    dto.actorUuid = log.actorUuid;
    dto.createdAt = log.createdAt;
    dto.changes = await this.auditPipelineService.buildChangeSet(
      log.entityName,
      log.changes,
      locale,
    );

    return dto;
  }
}
