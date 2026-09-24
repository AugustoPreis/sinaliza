import { mockDeep } from 'jest-mock-extended';

import { AuditLogQueryDTO } from '../../dtos/audit-log-query.dto';
import { AuditLogResponseDTO } from '../../dtos/audit-log-response.dto';
import { AuditLogEntity } from '../../entities/audit-log.entity';
import { EAuditAction } from '../../enums/audit-action.enum';
import { AuditLogResponseMapper } from '../../mappers/audit-log-response.mapper';
import { AuditLogsRepository } from '../../repositories/audit-logs.repository';
import { ListAuditLogsUseCase } from '../list-audit-logs.use-case';

describe('ListAuditLogsUseCase', () => {
  let auditLogsRepository: ReturnType<typeof mockDeep<AuditLogsRepository>>;
  let auditLogResponseMapper: ReturnType<typeof mockDeep<AuditLogResponseMapper>>;
  let useCase: ListAuditLogsUseCase;

  const buildQuery = (overrides: Partial<AuditLogQueryDTO> = {}): AuditLogQueryDTO => {
    const query = new AuditLogQueryDTO();

    query.page = 1;
    query.perPage = 10;

    return Object.assign(query, overrides);
  };

  const buildLog = (uuid: string): AuditLogEntity =>
    ({
      uuid,
      entityName: 'User',
      entityUuid: 'entity-uuid',
      action: EAuditAction.UPDATED,
      actorUuid: 'actor-uuid',
      changes: [],
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    }) as unknown as AuditLogEntity;

  beforeEach(() => {
    auditLogsRepository = mockDeep<AuditLogsRepository>();
    auditLogResponseMapper = mockDeep<AuditLogResponseMapper>();
    useCase = new ListAuditLogsUseCase(auditLogsRepository, auditLogResponseMapper);
  });

  it('forwards pagination and filters to the repository and maps each result', async () => {
    const query = buildQuery({
      entityName: 'User',
      entityUuid: 'entity-uuid',
      actorUuid: 'actor-uuid',
      action: EAuditAction.UPDATED,
    });
    const logs = [buildLog('log-1'), buildLog('log-2')];
    const meta = { total: 2, page: 1, perPage: 10, lastPage: 1 };
    const dtoOne = Object.assign(new AuditLogResponseDTO(), { uuid: 'log-1' });
    const dtoTwo = Object.assign(new AuditLogResponseDTO(), { uuid: 'log-2' });

    auditLogsRepository.findAll.mockResolvedValue({ data: logs, meta });
    auditLogResponseMapper.toResponseDTO
      .mockResolvedValueOnce(dtoOne)
      .mockResolvedValueOnce(dtoTwo);

    const result = await useCase.execute(query, 'en-US');

    expect(auditLogsRepository.findAll).toHaveBeenCalledWith(1, 10, {
      entityName: 'User',
      entityUuid: 'entity-uuid',
      actorUuid: 'actor-uuid',
      action: EAuditAction.UPDATED,
    });
    expect(auditLogResponseMapper.toResponseDTO).toHaveBeenNthCalledWith(1, logs[0], 'en-US');
    expect(auditLogResponseMapper.toResponseDTO).toHaveBeenNthCalledWith(2, logs[1], 'en-US');
    expect(result).toEqual({ data: [dtoOne, dtoTwo], meta });
  });

  it('returns an empty page without calling the mapper when there is no data', async () => {
    const query = buildQuery();
    const meta = { total: 0, page: 1, perPage: 10, lastPage: 1 };

    auditLogsRepository.findAll.mockResolvedValue({ data: [], meta });

    const result = await useCase.execute(query, 'en-US');

    expect(auditLogResponseMapper.toResponseDTO).not.toHaveBeenCalled();
    expect(result).toEqual({ data: [], meta });
  });

  it('propagates repository errors', async () => {
    const query = buildQuery();

    auditLogsRepository.findAll.mockRejectedValue(new Error('connection lost'));

    await expect(useCase.execute(query, 'en-US')).rejects.toThrow('connection lost');
  });
});
