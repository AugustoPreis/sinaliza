import { mockDeep } from 'jest-mock-extended';

import { AuditFieldChangeDTO } from '@shared/audit/dtos/audit-field-change.dto';
import { AuditPipelineService } from '@shared/audit/pipeline/audit-pipeline.service';

import { AuditLogEntity } from '../../entities/audit-log.entity';
import { EAuditAction } from '../../enums/audit-action.enum';
import { AuditLogResponseMapper } from '../audit-log-response.mapper';

describe('AuditLogResponseMapper', () => {
  let auditPipelineService: ReturnType<typeof mockDeep<AuditPipelineService>>;
  let mapper: AuditLogResponseMapper;

  const log = {
    uuid: 'log-uuid',
    entityName: 'User',
    entityUuid: 'entity-uuid',
    action: EAuditAction.UPDATED,
    actorUuid: 'actor-uuid',
    changes: [{ field: 'name', old: 'Old', new: 'New' }],
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  } as unknown as AuditLogEntity;

  beforeEach(() => {
    auditPipelineService = mockDeep<AuditPipelineService>();
    mapper = new AuditLogResponseMapper(auditPipelineService);
  });

  it('assembles the response DTO from the entity and the pipeline results', async () => {
    const changeSet = [Object.assign(new AuditFieldChangeDTO(), { field: 'name' })];

    auditPipelineService.resolveEntityLabel.mockReturnValue('User label');
    auditPipelineService.buildChangeSet.mockResolvedValue(changeSet);

    const dto = await mapper.toResponseDTO(log, 'en-US');

    expect(auditPipelineService.resolveEntityLabel).toHaveBeenCalledWith('User', 'en-US');
    expect(auditPipelineService.buildChangeSet).toHaveBeenCalledWith('User', log.changes, 'en-US');
    expect(dto).toMatchObject({
      uuid: 'log-uuid',
      entityName: 'User',
      entityLabel: 'User label',
      entityUuid: 'entity-uuid',
      action: EAuditAction.UPDATED,
      actorUuid: 'actor-uuid',
      createdAt: log.createdAt,
      changes: changeSet,
    });
  });

  it('propagates errors raised while building the change set', async () => {
    auditPipelineService.resolveEntityLabel.mockReturnValue('User label');
    auditPipelineService.buildChangeSet.mockRejectedValue(new Error('translation failed'));

    await expect(mapper.toResponseDTO(log, 'en-US')).rejects.toThrow('translation failed');
  });
});
