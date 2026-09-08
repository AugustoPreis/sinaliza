import { DataSource } from 'typeorm';

import { PermissionEntity } from '@modules/roles/entities/permission.entity';
import { PermissionsRepository } from '@modules/roles/repositories/permissions.repository';

import { startContainers, stopContainers, ITestContainers } from '../../support/containers';
import { cleanDatabase } from '../../support/db-cleaner';
import { buildPermission } from '../../support/entity-factories';
import { createTestDataSource } from '../../support/test-data-source';

describe('PermissionsRepository (integration)', () => {
  let containers: ITestContainers;
  let dataSource: DataSource;
  let permissionsRepository: PermissionsRepository;

  beforeAll(async () => {
    containers = await startContainers();
    dataSource = await createTestDataSource(containers.postgres);
    permissionsRepository = new PermissionsRepository(dataSource.getRepository(PermissionEntity));
  }, 60000);

  afterAll(async () => {
    await dataSource.destroy();
    await stopContainers(containers);
  });

  beforeEach(async () => {
    await cleanDatabase(dataSource);
  });

  describe('findById / findByUuid / findByResourceAction', () => {
    it('finds an existing permission by id', async () => {
      const permission = await permissionsRepository.create(
        buildPermission({ resource: 'users', action: 'create' }),
      );

      const found = await permissionsRepository.findById(permission.id);

      expect(found).not.toBeNull();
      expect(found?.resource).toBe('users');
      expect(found?.action).toBe('create');
    });

    it('finds an existing permission by uuid', async () => {
      const permission = await permissionsRepository.create(
        buildPermission({ resource: 'users', action: 'read' }),
      );

      const found = await permissionsRepository.findByUuid(permission.uuid);

      expect(found).not.toBeNull();
      expect(found?.id).toBe(permission.id);
    });

    it('finds an existing permission by resource+action', async () => {
      const permission = await permissionsRepository.create(
        buildPermission({ resource: 'users', action: 'update' }),
      );

      const found = await permissionsRepository.findByResourceAction('users', 'update');

      expect(found).not.toBeNull();
      expect(found?.uuid).toBe(permission.uuid);
    });

    it('returns null for an id that does not exist', async () => {
      expect(await permissionsRepository.findById(999_999)).toBeNull();
    });

    it('returns null for a uuid that does not exist', async () => {
      expect(
        await permissionsRepository.findByUuid('00000000-0000-4000-8000-000000000000'),
      ).toBeNull();
    });

    it('returns null for a resource+action that does not exist', async () => {
      expect(await permissionsRepository.findByResourceAction('nope', 'nope')).toBeNull();
    });
  });

  describe('findByResourceActionPairs', () => {
    it('returns an empty array without querying when the list is empty', async () => {
      const result = await permissionsRepository.findByResourceActionPairs([]);

      expect(result).toEqual([]);
    });

    it('returns only the pairs that exist', async () => {
      const permA = await permissionsRepository.create(
        buildPermission({ resource: 'users', action: 'create' }),
      );
      const permB = await permissionsRepository.create(
        buildPermission({ resource: 'users', action: 'read' }),
      );
      await permissionsRepository.create(buildPermission({ resource: 'users', action: 'delete' }));

      const result = await permissionsRepository.findByResourceActionPairs([
        { resource: 'users', action: 'create' },
        { resource: 'users', action: 'read' },
        { resource: 'users', action: 'does-not-exist' },
      ]);

      expect(result).toHaveLength(2);
      expect(result.map((p) => p.id).sort()).toEqual([permA.id, permB.id].sort());
    });
  });

  describe('findByIds', () => {
    it('returns an empty array without querying when the list is empty', async () => {
      const result = await permissionsRepository.findByIds([]);

      expect(result).toEqual([]);
    });

    it('returns the entities matching the given ids', async () => {
      const permA = await permissionsRepository.create(
        buildPermission({ resource: 'roles', action: 'create' }),
      );
      const permB = await permissionsRepository.create(
        buildPermission({ resource: 'roles', action: 'read' }),
      );
      await permissionsRepository.create(buildPermission({ resource: 'roles', action: 'delete' }));

      const result = await permissionsRepository.findByIds([permA.id, permB.id]);

      expect(result).toHaveLength(2);
      expect(result.map((p) => p.id).sort()).toEqual([permA.id, permB.id].sort());
    });
  });

  describe('findAll', () => {
    it('filters by resource', async () => {
      await permissionsRepository.create(buildPermission({ resource: 'users', action: 'create' }));
      await permissionsRepository.create(buildPermission({ resource: 'roles', action: 'create' }));

      const result = await permissionsRepository.findAll({
        page: 1,
        perPage: 20,
        resource: 'users',
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].resource).toBe('users');
    });

    it('paginates results and reports the correct total', async () => {
      await permissionsRepository.create(buildPermission({ resource: 'a', action: 'create' }));
      await permissionsRepository.create(buildPermission({ resource: 'b', action: 'create' }));
      await permissionsRepository.create(buildPermission({ resource: 'c', action: 'create' }));

      const firstPage = await permissionsRepository.findAll({
        page: 1,
        perPage: 2,
      });
      const secondPage = await permissionsRepository.findAll({
        page: 2,
        perPage: 2,
      });

      expect(firstPage.data).toHaveLength(2);
      expect(firstPage.meta.total).toBe(3);
      expect(firstPage.meta.lastPage).toBe(2);

      expect(secondPage.data).toHaveLength(1);
      expect(secondPage.meta.total).toBe(3);
    });

    it('orders results by resource ASC, then action ASC', async () => {
      await permissionsRepository.create(buildPermission({ resource: 'b-resource', action: 'z' }));
      await permissionsRepository.create(buildPermission({ resource: 'a-resource', action: 'y' }));
      await permissionsRepository.create(buildPermission({ resource: 'a-resource', action: 'x' }));

      const result = await permissionsRepository.findAll({
        page: 1,
        perPage: 20,
      });

      expect(result.data.map((p) => [p.resource, p.action])).toEqual([
        ['a-resource', 'x'],
        ['a-resource', 'y'],
        ['b-resource', 'z'],
      ]);
    });
  });

  describe('create', () => {
    it('saves and returns the permission', async () => {
      const created = await permissionsRepository.create(
        buildPermission({ resource: 'audit', action: 'read', description: 'view audit logs' }),
      );

      expect(created.id).toBeGreaterThan(0);
      expect(created.resource).toBe('audit');
      expect(created.action).toBe('read');
      expect(created.description).toBe('view audit logs');
    });
  });

  describe('update', () => {
    it('applies only the passed fields, leaving the rest untouched', async () => {
      const permission = await permissionsRepository.create(
        buildPermission({ resource: 'audit', action: 'read', description: 'original description' }),
      );

      const updated = await permissionsRepository.update(permission.id, {
        description: 'updated description',
      });

      expect(updated.description).toBe('updated description');
      expect(updated.resource).toBe('audit');
      expect(updated.action).toBe('read');
    });
  });

  describe('delete', () => {
    it('removes an existing permission', async () => {
      const permission = await permissionsRepository.create(
        buildPermission({ resource: 'audit', action: 'delete' }),
      );

      await permissionsRepository.delete(permission.id);

      expect(await permissionsRepository.findById(permission.id)).toBeNull();
    });

    it('is idempotent when the permission does not exist', async () => {
      await expect(permissionsRepository.delete(999_999)).resolves.toBeUndefined();
    });
  });
});
