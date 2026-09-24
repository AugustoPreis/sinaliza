import { Injectable } from '@nestjs/common';

import { AuditPipelineService } from '@shared/audit/pipeline/audit-pipeline.service';
import { UuidService } from '@shared/services/uuid.service';

import { IAuditChangeRequestedEvent } from '../events/audit-change-requested.event';
import { AuditLogsRepository } from '../repositories/audit-logs.repository';

@Injectable()
export class RecordAuditLogUseCase {
  constructor(
    private readonly auditPipelineService: AuditPipelineService,
    private readonly auditLogsRepository: AuditLogsRepository,
    private readonly uuidService: UuidService,
  ) {}

  async execute(event: IAuditChangeRequestedEvent): Promise<void> {
    const diffs = await this.auditPipelineService.recordChange({
      entityName: event.entityName,
      entityUuid: event.entityUuid,
      actorUuid: event.actorUuid,
      action: event.action,
      before: event.before,
      after: event.after,
    });

    if (diffs.length === 0) {
      return;
    }

    await this.auditLogsRepository.create({
      uuid: this.uuidService.generate(),
      entityName: event.entityName,
      entityUuid: event.entityUuid,
      action: event.action,
      actorUuid: event.actorUuid,
      changes: diffs,
    });
  }
}
