import { DataSource } from 'typeorm';

import { PermissionEntity } from '@modules/roles/entities/permission.entity';
import { RoleEntity } from '@modules/roles/entities/role.entity';
import { RolesRepository } from '@modules/roles/repositories/roles.repository';

import { startContainers, stopContainers, ITestContainers } from '../../support/containers';
import { cleanDatabase } from '../../support/db-cleaner';
import { buildPermission, buildRole } from '../../support/entity-factories';
import { createTestDataSource } from '../../support/test-data-source';

describe('RolesRepository (integration)', () => {
  let containers: ITestContainers;
  let dataSource: DataSource;
  let rolesRepository: RolesRepository;

  beforeAll(async () => {
    containers = await startContainers();
    dataSource = await createTestDataSource(containers.postgres);
    rolesRepository = new RolesRepository(
      dataSource.getRepository(RoleEntity),
      dataSource.getRepository(PermissionEntity),
    );
  }, 60000);

  afterAll(async () => {
    await dataSource.destroy();
    await stopContainers(containers);
  });

  beforeEach(async () => {
    await cleanDatabase(dataSource);
  });

  describe('findById / findByUuid / findByName', () => {
    it('finds an existing role by id', async () => {
      const role = await rolesRepository.create(buildRole({ name: 'find-by-id' }));

      const found = await rolesRepository.findById(role.id);

      expect(found).not.toBeNull();
      expect(found?.name).toBe('find-by-id');
    });

    it('finds an existing role by uuid', async () => {
      const role = await rolesRepository.create(buildRole({ name: 'find-by-uuid' }));

      const found = await rolesRepository.findByUuid(role.uuid);

      expect(found).not.toBeNull();
      expect(found?.id).toBe(role.id);
    });

    it('finds an existing role by name', async () => {
      const role = await rolesRepository.create(buildRole({ name: 'find-by-name' }));

      const found = await rolesRepository.findByName('find-by-name');

      expect(found).not.toBeNull();
      expect(found?.uuid).toBe(role.uuid);
    });

    it('returns null for an id that does not exist', async () => {
      expect(await rolesRepository.findById(999_999)).toBeNull();
    });

    it('returns null for a uuid that does not exist', async () => {
      expect(await rolesRepository.findByUuid('00000000-0000-4000-8000-000000000000')).toBeNull();
    });

    it('returns null for a name that does not exist', async () => {
      expect(await rolesRepository.findByName('does-not-exist')).toBeNull();
    });
  });

  describe('findAll', () => {
    it('filters by search (partial, case-insensitive match on name)', async () => {
      await rolesRepository.create(buildRole({ name: 'Administrator' }));
      await rolesRepository.create(buildRole({ name: 'Editor' }));
      await rolesRepository.create(buildRole({ name: 'Guest' }));

      const result = await rolesRepository.findAll({
        page: 1,
        perPage: 20,
        search: 'admin',
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe('Administrator');
    });

    it('does not filter anything when search is empty/undefined', async () => {
      await rolesRepository.create(buildRole({ name: 'role-undefined-search-1' }));
      await rolesRepository.create(buildRole({ name: 'role-undefined-search-2' }));

      const withUndefinedSearch = await rolesRepository.findAll({
        page: 1,
        perPage: 20,
      });

      expect(withUndefinedSearch.data).toHaveLength(2);

      const withEmptySearch = await rolesRepository.findAll({
        page: 1,
        perPage: 20,
        search: '',
      });

      expect(withEmptySearch.data).toHaveLength(2);
    });

    it('paginates results and reports the correct total', async () => {
      await rolesRepository.create(buildRole({ name: 'page-role-a' }));
      await rolesRepository.create(buildRole({ name: 'page-role-b' }));
      await rolesRepository.create(buildRole({ name: 'page-role-c' }));

      const firstPage = await rolesRepository.findAll({ page: 1, perPage: 2 });
      const secondPage = await rolesRepository.findAll({ page: 2, perPage: 2 });

      expect(firstPage.data).toHaveLength(2);
      expect(firstPage.meta.total).toBe(3);
      expect(firstPage.meta.lastPage).toBe(2);

      expect(secondPage.data).toHaveLength(1);
      expect(secondPage.meta.total).toBe(3);
    });
  });

  describe('create', () => {
    it('creates a role with explicit permissions', async () => {
      const permRepo = dataSource.getRepository(PermissionEntity);
      const permA = await permRepo.save(buildPermission({ resource: 'users', action: 'create' }));
      const permB = await permRepo.save(buildPermission({ resource: 'users', action: 'read' }));

      const role = await rolesRepository.create(
        buildRole({ name: 'role-with-permissions', permissions: [permA, permB] }),
      );

      expect(role.permissions.map((p) => p.id).sort()).toEqual([permA.id, permB.id].sort());
    });

    it('defaults permissions to an empty array when not provided', async () => {
      const role = await rolesRepository.create(buildRole({ name: 'role-without-permissions' }));

      expect(role.permissions).toEqual([]);
    });
  });

  describe('update', () => {
    it('applies only the passed fields, leaving the rest untouched', async () => {
      const role = await rolesRepository.create(
        buildRole({ name: 'original-name', description: 'original description' }),
      );

      const updated = await rolesRepository.update(role.id, { name: 'updated-name' });

      expect(updated.name).toBe('updated-name');
      expect(updated.description).toBe('original description');
    });
  });

  describe('delete', () => {
    it('removes an existing role', async () => {
      const role = await rolesRepository.create(buildRole({ name: 'to-be-deleted' }));

      await rolesRepository.delete(role.id);

      expect(await rolesRepository.findById(role.id)).toBeNull();
    });

    it('is idempotent when the role does not exist', async () => {
      await expect(rolesRepository.delete(999_999)).resolves.toBeUndefined();
    });
  });

  describe('setPermissions', () => {
    it('fully replaces the set of permissions assigned to a role', async () => {
      const permRepo = dataSource.getRepository(PermissionEntity);
      const permA = await permRepo.save(buildPermission({ resource: 'roles', action: 'create' }));
      const permB = await permRepo.save(buildPermission({ resource: 'roles', action: 'read' }));
      const permC = await permRepo.save(buildPermission({ resource: 'roles', action: 'delete' }));

      const role = await rolesRepository.create(buildRole({ name: 'set-permissions-role' }));

      await rolesRepository.setPermissions(role.id, [permA.id, permB.id]);

      const afterFirstSet = await rolesRepository.findById(role.id);
      expect(afterFirstSet?.permissions.map((p) => p.id).sort()).toEqual(
        [permA.id, permB.id].sort(),
      );

      await rolesRepository.setPermissions(role.id, [permC.id]);

      const afterSecondSet = await rolesRepository.findById(role.id);
      expect(afterSecondSet?.permissions.map((p) => p.id)).toEqual([permC.id]);
    });
  });
});
