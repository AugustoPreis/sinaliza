import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { IFieldDiff } from '@shared/audit/interfaces';
import { RequestContextService } from '@shared/context/request-context.service';

import { EAuditAction } from '@modules/audit/enums/audit-action.enum';
import { AuditLogsRepository } from '@modules/audit/repositories/audit-logs.repository';
import { EUserStatus } from '@modules/users/enums/user-status.enum';
import { UsersRepository } from '@modules/users/repositories/users.repository';

import { startContainers, stopContainers, ITestContainers } from '../../support/containers';
import { cleanDatabase } from '../../support/db-cleaner';
import { buildUser } from '../../support/entity-factories';
import { bootstrapTestApp } from '../../support/test-app.helper';
import { createTestDataSource } from '../../support/test-data-source';

async function waitForAuditLog(
  auditLogsRepository: AuditLogsRepository,
  entityUuid: string,
  action: EAuditAction,
): Promise<{ changes: IFieldDiff[]; actorUuid: string | null }> {
  const deadline = Date.now() + 5000;

  while (Date.now() < deadline) {
    const { data } = await auditLogsRepository.findAll(1, 10, { entityUuid, action });

    if (data.length > 0) {
      return data[0];
    }

    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  throw new Error(`Timed out waiting for a ${action} audit log for entity ${entityUuid}`);
}

describe('audit trail (integration)', () => {
  let containers: ITestContainers;
  let dataSource: DataSource;
  let app: INestApplication;
  let usersRepository: UsersRepository;
  let auditLogsRepository: AuditLogsRepository;
  let requestContextService: RequestContextService;

  beforeAll(async () => {
    containers = await startContainers();
    dataSource = await createTestDataSource(containers.postgres);

    app = await bootstrapTestApp({
      dbHost: containers.postgres.getHost(),
      dbPort: containers.postgres.getPort(),
      dbUsername: containers.postgres.getUsername(),
      dbPassword: containers.postgres.getPassword(),
      dbName: containers.postgres.getDatabase(),
      redisHost: containers.redis.getHost(),
      redisPort: containers.redis.getPort(),
    });

    usersRepository = app.get(UsersRepository);
    auditLogsRepository = app.get(AuditLogsRepository);
    requestContextService = app.get(RequestContextService);
  }, 60000);

  afterAll(async () => {
    await app.close();
    await dataSource.destroy();
    await stopContainers(containers);
  });

  beforeEach(async () => {
    await cleanDatabase(dataSource);
  });

  it('records a CREATED log with no actor when a user is inserted outside of a request', async () => {
    const user = await usersRepository.create(buildUser({ name: 'Ada Lovelace' }));

    const log = await waitForAuditLog(auditLogsRepository, user.uuid, EAuditAction.CREATED);

    expect(log.actorUuid).toBeNull();

    const nameDiff = log.changes.find((change) => change.field === 'name');

    expect(nameDiff).toEqual({ field: 'name', old: null, new: 'Ada Lovelace' });
  });

  it('records an UPDATED log with the diff and the acting user, driven by a real save()', async () => {
    const user = await usersRepository.create(buildUser({ name: 'Grace Hopper' }));
    const actor = await usersRepository.create(buildUser({ name: 'Actor' }));

    await requestContextService.run({ actorUuid: actor.uuid }, () =>
      usersRepository.update(user.id, { name: 'Grace Brewster Hopper' }),
    );

    const log = await waitForAuditLog(auditLogsRepository, user.uuid, EAuditAction.UPDATED);

    expect(log.actorUuid).toBe(actor.uuid);
    expect(log.changes).toEqual([
      { field: 'name', old: 'Grace Hopper', new: 'Grace Brewster Hopper' },
    ]);
  });

  it('does not emit a change when save() is called without an actually changed tracked field', async () => {
    const user = await usersRepository.create(buildUser({ name: 'Margaret Hamilton' }));

    await usersRepository.update(user.id, { name: 'Margaret Hamilton' });

    await expect(
      waitForAuditLog(auditLogsRepository, user.uuid, EAuditAction.UPDATED),
    ).rejects.toThrow(/Timed out/);
  });

  it('records a DELETED log via softRemove(), with the last known field values', async () => {
    const user = await usersRepository.create(
      buildUser({ name: 'Katherine Johnson', status: EUserStatus.ACTIVE }),
    );

    await usersRepository.softDelete(user.id);

    const log = await waitForAuditLog(auditLogsRepository, user.uuid, EAuditAction.DELETED);

    const nameDiff = log.changes.find((change) => change.field === 'name');

    expect(nameDiff).toEqual({ field: 'name', old: 'Katherine Johnson', new: null });
  });
});
