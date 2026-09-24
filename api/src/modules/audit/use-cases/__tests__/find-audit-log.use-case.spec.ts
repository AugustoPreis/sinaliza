import { HttpStatus } from '@nestjs/common';
import { mockDeep } from 'jest-mock-extended';

import { AppException } from '@shared/exceptions';

import { AuditLogResponseDTO } from '../../dtos/audit-log-response.dto';
import { AuditLogEntity } from '../../entities/audit-log.entity';
import { EAuditAction } from '../../enums/audit-action.enum';
import { AuditLogResponseMapper } from '../../mappers/audit-log-response.mapper';
import { AuditLogsRepository } from '../../repositories/audit-logs.repository';
import { FindAuditLogUseCase } from '../find-audit-log.use-case';

describe('FindAuditLogUseCase', () => {
  let auditLogsRepository: ReturnType<typeof mockDeep<AuditLogsRepository>>;
  let auditLogResponseMapper: ReturnType<typeof mockDeep<AuditLogResponseMapper>>;
  let useCase: FindAuditLogUseCase;

  const log = {
    uuid: 'log-uuid',
    entityName: 'User',
    entityUuid: 'entity-uuid',
    action: EAuditAction.UPDATED,
    actorUuid: 'actor-uuid',
    changes: [],
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  } as unknown as AuditLogEntity;

  beforeEach(() => {
    auditLogsRepository = mockDeep<AuditLogsRepository>();
    auditLogResponseMapper = mockDeep<AuditLogResponseMapper>();
    useCase = new FindAuditLogUseCase(auditLogsRepository, auditLogResponseMapper);
  });

  it('returns the mapped DTO when the log exists', async () => {
    const dto = new AuditLogResponseDTO();

    auditLogsRepository.findByUuid.mockResolvedValue(log);
    auditLogResponseMapper.toResponseDTO.mockResolvedValue(dto);

    const result = await useCase.execute('log-uuid', 'en-US');

    expect(auditLogsRepository.findByUuid).toHaveBeenCalledWith('log-uuid');
    expect(auditLogResponseMapper.toResponseDTO).toHaveBeenCalledWith(log, 'en-US');
    expect(result).toBe(dto);
  });

  it('throws a 404 AppException when the log does not exist', async () => {
    auditLogsRepository.findByUuid.mockResolvedValue(null);

    await expect(useCase.execute('missing-uuid', 'en-US')).rejects.toMatchObject({
      i18nKey: 'audit.errors.notFound',
      status: HttpStatus.NOT_FOUND,
    });
    expect(auditLogResponseMapper.toResponseDTO).not.toHaveBeenCalled();
  });

  it('throws an instance of AppException when the log does not exist', async () => {
    auditLogsRepository.findByUuid.mockResolvedValue(null);

    await expect(useCase.execute('missing-uuid', 'en-US')).rejects.toBeInstanceOf(AppException);
  });
});
