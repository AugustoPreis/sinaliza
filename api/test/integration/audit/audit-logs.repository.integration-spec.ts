import { DataSource } from 'typeorm';

import { AuditLogEntity } from '@modules/audit/entities/audit-log.entity';
import { EAuditAction } from '@modules/audit/enums/audit-action.enum';
import { AuditLogsRepository } from '@modules/audit/repositories/audit-logs.repository';

import { startContainers, stopContainers, ITestContainers } from '../../support/containers';
import { cleanDatabase } from '../../support/db-cleaner';
import { buildAuditLog } from '../../support/entity-factories';
import { createTestDataSource } from '../../support/test-data-source';

describe('AuditLogsRepository (integration)', () => {
  let containers: ITestContainers;
  let dataSource: DataSource;
  let repository: AuditLogsRepository;

  beforeAll(async () => {
    containers = await startContainers();
    dataSource = await createTestDataSource(containers.postgres);

    repository = new AuditLogsRepository(dataSource.getRepository(AuditLogEntity));
  }, 60000);

  afterAll(async () => {
    await dataSource.destroy();
    await stopContainers(containers);
  });

  beforeEach(async () => {
    await cleanDatabase(dataSource);
  });

  describe('findByUuid', () => {
    it('returns the log when it exists', async () => {
      const created = await repository.create(buildAuditLog({ entityName: 'user' }));

      const found = await repository.findByUuid(created.uuid);

      expect(found).not.toBeNull();
      expect(found?.uuid).toBe(created.uuid);
      expect(found?.entityName).toBe('user');
    });

    it('returns null when it does not exist', async () => {
      const found = await repository.findByUuid('00000000-0000-0000-0000-000000000000');

      expect(found).toBeNull();
    });
  });

  describe('create', () => {
    it('persists the entity and returns it with an id', async () => {
      const saved = await repository.create(
        buildAuditLog({ entityName: 'role', action: EAuditAction.CREATED }),
      );

      expect(saved.id).toBeGreaterThan(0);
      expect(saved.entityName).toBe('role');
      expect(saved.action).toBe(EAuditAction.CREATED);

      const found = await repository.findByUuid(saved.uuid);
      expect(found).not.toBeNull();
    });
  });

  describe('findAll', () => {
    const entityUuidA = '11111111-1111-1111-1111-111111111111';
    const entityUuidB = '22222222-2222-2222-2222-222222222222';
    const actorUuidA = '33333333-3333-3333-3333-333333333333';
    const actorUuidB = '44444444-4444-4444-4444-444444444444';

    async function seedLogs(): Promise<AuditLogEntity[]> {
      const specs = [
        {
          entityName: 'user',
          entityUuid: entityUuidA,
          actorUuid: actorUuidA,
          action: EAuditAction.CREATED,
        },
        {
          entityName: 'user',
          entityUuid: entityUuidA,
          actorUuid: actorUuidB,
          action: EAuditAction.UPDATED,
        },
        {
          entityName: 'role',
          entityUuid: entityUuidB,
          actorUuid: actorUuidA,
          action: EAuditAction.UPDATED,
        },
        {
          entityName: 'role',
          entityUuid: entityUuidB,
          actorUuid: actorUuidB,
          action: EAuditAction.DELETED,
        },
        {
          entityName: 'permission',
          entityUuid: entityUuidB,
          actorUuid: actorUuidA,
          action: EAuditAction.CREATED,
        },
      ];

      const created: AuditLogEntity[] = [];

      for (const spec of specs) {
        created.push(await repository.create(buildAuditLog(spec)));
        await new Promise((resolve) => setTimeout(resolve, 5));
      }

      return created;
    }

    it('filters by entityName', async () => {
      await seedLogs();

      const result = await repository.findAll(1, 10, { entityName: 'role' });

      expect(result.data).toHaveLength(2);
      expect(result.data.every((log) => log.entityName === 'role')).toBe(true);
      expect(result.meta.total).toBe(2);
    });

    it('filters by entityUuid', async () => {
      await seedLogs();

      const result = await repository.findAll(1, 10, { entityUuid: entityUuidA });

      expect(result.data).toHaveLength(2);
      expect(result.data.every((log) => log.entityUuid === entityUuidA)).toBe(true);
      expect(result.meta.total).toBe(2);
    });

    it('filters by actorUuid', async () => {
      await seedLogs();

      const result = await repository.findAll(1, 10, { actorUuid: actorUuidB });

      expect(result.data).toHaveLength(2);
      expect(result.data.every((log) => log.actorUuid === actorUuidB)).toBe(true);
      expect(result.meta.total).toBe(2);
    });

    it('filters by action', async () => {
      await seedLogs();

      const result = await repository.findAll(1, 10, { action: EAuditAction.UPDATED });

      expect(result.data).toHaveLength(2);
      expect(result.data.every((log) => log.action === EAuditAction.UPDATED)).toBe(true);
      expect(result.meta.total).toBe(2);
    });

    it('combines all filters at once', async () => {
      await seedLogs();

      const result = await repository.findAll(1, 10, {
        entityName: 'user',
        entityUuid: entityUuidA,
        actorUuid: actorUuidB,
        action: EAuditAction.UPDATED,
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toMatchObject({
        entityName: 'user',
        entityUuid: entityUuidA,
        actorUuid: actorUuidB,
        action: EAuditAction.UPDATED,
      });
      expect(result.meta.total).toBe(1);
    });

    it('returns no results when the combined filters match nothing', async () => {
      await seedLogs();

      const result = await repository.findAll(1, 10, {
        entityName: 'user',
        entityUuid: entityUuidB,
        actorUuid: actorUuidA,
        action: EAuditAction.DELETED,
      });

      expect(result.data).toHaveLength(0);
      expect(result.meta.total).toBe(0);
    });

    it('paginates results and reports total/lastPage correctly', async () => {
      const created = await seedLogs();

      const firstPage = await repository.findAll(1, 2, {});
      const secondPage = await repository.findAll(2, 2, {});
      const thirdPage = await repository.findAll(3, 2, {});

      expect(firstPage.data).toHaveLength(2);
      expect(secondPage.data).toHaveLength(2);
      expect(thirdPage.data).toHaveLength(1);

      expect(firstPage.meta).toEqual({
        total: created.length,
        page: 1,
        perPage: 2,
        lastPage: 3,
      });
      expect(secondPage.meta.page).toBe(2);
      expect(thirdPage.meta.page).toBe(3);
    });

    it('orders results by createdAt DESC (most recently created first)', async () => {
      const created = await seedLogs();

      const result = await repository.findAll(1, created.length, {});

      const expectedOrder = [...created].reverse().map((log) => log.uuid);

      expect(result.data.map((log) => log.uuid)).toEqual(expectedOrder);
    });
  });
});
