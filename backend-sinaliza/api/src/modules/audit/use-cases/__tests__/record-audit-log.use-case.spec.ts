import { mockDeep } from 'jest-mock-extended';

import { AuditPipelineService } from '@shared/audit/pipeline/audit-pipeline.service';
import { UuidService } from '@shared/services/uuid.service';

import { EAuditAction } from '../../enums/audit-action.enum';
import { IAuditChangeRequestedEvent } from '../../events/audit-change-requested.event';
import { AuditLogsRepository } from '../../repositories/audit-logs.repository';
import { RecordAuditLogUseCase } from '../record-audit-log.use-case';

describe('RecordAuditLogUseCase', () => {
  let auditPipelineService: ReturnType<typeof mockDeep<AuditPipelineService>>;
  let auditLogsRepository: ReturnType<typeof mockDeep<AuditLogsRepository>>;
  let uuidService: ReturnType<typeof mockDeep<UuidService>>;
  let useCase: RecordAuditLogUseCase;

  const event: IAuditChangeRequestedEvent = {
    entityName: 'User',
    entityUuid: 'entity-uuid',
    actorUuid: 'actor-uuid',
    action: EAuditAction.UPDATED,
    before: { name: 'Old' },
    after: { name: 'New' },
  };

  beforeEach(() => {
    auditPipelineService = mockDeep<AuditPipelineService>();
    auditLogsRepository = mockDeep<AuditLogsRepository>();
    uuidService = mockDeep<UuidService>();
    useCase = new RecordAuditLogUseCase(auditPipelineService, auditLogsRepository, uuidService);
  });

  it('persists the audit log when the pipeline finds diffs', async () => {
    const diffs = [{ field: 'name', old: 'Old', new: 'New' }];

    auditPipelineService.recordChange.mockResolvedValue(diffs);
    uuidService.generate.mockReturnValue('generated-uuid');

    await useCase.execute(event);

    expect(auditPipelineService.recordChange).toHaveBeenCalledWith({
      entityName: event.entityName,
      entityUuid: event.entityUuid,
      actorUuid: event.actorUuid,
      action: event.action,
      before: event.before,
      after: event.after,
    });
    expect(auditLogsRepository.create).toHaveBeenCalledWith({
      uuid: 'generated-uuid',
      entityName: event.entityName,
      entityUuid: event.entityUuid,
      action: event.action,
      actorUuid: event.actorUuid,
      changes: diffs,
    });
  });

  it('skips persistence when the pipeline finds no diffs', async () => {
    auditPipelineService.recordChange.mockResolvedValue([]);

    await useCase.execute(event);

    expect(auditLogsRepository.create).not.toHaveBeenCalled();
    expect(uuidService.generate).not.toHaveBeenCalled();
  });

  it('propagates repository errors', async () => {
    auditPipelineService.recordChange.mockResolvedValue([
      { field: 'name', old: 'Old', new: 'New' },
    ]);
    uuidService.generate.mockReturnValue('generated-uuid');
    auditLogsRepository.create.mockRejectedValue(new Error('write failed'));

    await expect(useCase.execute(event)).rejects.toThrow('write failed');
  });
});
