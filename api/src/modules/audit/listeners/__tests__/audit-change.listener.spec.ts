import { Logger } from '@nestjs/common';
import { mockDeep } from 'jest-mock-extended';

import { EAuditAction } from '../../enums/audit-action.enum';
import { IAuditChangeRequestedEvent } from '../../events/audit-change-requested.event';
import { RecordAuditLogUseCase } from '../../use-cases/record-audit-log.use-case';
import { AuditChangeListener } from '../audit-change.listener';

describe('AuditChangeListener', () => {
  let recordAuditLogUseCase: ReturnType<typeof mockDeep<RecordAuditLogUseCase>>;
  let listener: AuditChangeListener;
  let loggerErrorSpy: jest.SpyInstance;

  const event: IAuditChangeRequestedEvent = {
    entityName: 'User',
    entityUuid: 'entity-uuid',
    actorUuid: 'actor-uuid',
    action: EAuditAction.UPDATED,
    before: { name: 'Old' },
    after: { name: 'New' },
  };

  beforeEach(() => {
    recordAuditLogUseCase = mockDeep<RecordAuditLogUseCase>();
    listener = new AuditChangeListener(recordAuditLogUseCase);
    loggerErrorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    loggerErrorSpy.mockRestore();
  });

  it('delegates the event to RecordAuditLogUseCase', async () => {
    recordAuditLogUseCase.execute.mockResolvedValue(undefined);

    await listener.handleAuditChangeRequested(event);

    expect(recordAuditLogUseCase.execute).toHaveBeenCalledWith(event);
    expect(loggerErrorSpy).not.toHaveBeenCalled();
  });

  it('logs and swallows errors raised by the use case', async () => {
    const error = new Error('pipeline failure');

    recordAuditLogUseCase.execute.mockRejectedValue(error);

    await expect(listener.handleAuditChangeRequested(event)).resolves.toBeUndefined();
    expect(loggerErrorSpy).toHaveBeenCalledWith(
      `Failed to record audit log for ${event.entityName}#${event.entityUuid}`,
      error.stack,
    );
  });

  it('logs the stringified error when a non-Error value is thrown', async () => {
    recordAuditLogUseCase.execute.mockRejectedValue('unexpected failure');

    await listener.handleAuditChangeRequested(event);

    expect(loggerErrorSpy).toHaveBeenCalledWith(
      `Failed to record audit log for ${event.entityName}#${event.entityUuid}`,
      'unexpected failure',
    );
  });
});
