import { DataSource } from 'typeorm';

import { RoleEntity } from '@modules/roles/entities/role.entity';
import { SectorUserEntity } from '@modules/users/entities/sector-user.entity';
import { UserRoleEntity } from '@modules/users/entities/user-role.entity';
import { UserEntity } from '@modules/users/entities/user.entity';
import { EUserStatus } from '@modules/users/enums/user-status.enum';
import { UsersRepository } from '@modules/users/repositories/users.repository';

import { startContainers, stopContainers, ITestContainers } from '../../support/containers';
import { cleanDatabase } from '../../support/db-cleaner';
import { buildRole, buildUser } from '../../support/entity-factories';
import { createTestDataSource } from '../../support/test-data-source';

describe('UsersRepository (integration)', () => {
  let containers: ITestContainers;
  let dataSource: DataSource;
  let usersRepository: UsersRepository;

  beforeAll(async () => {
    containers = await startContainers();
    dataSource = await createTestDataSource(containers.postgres);
    usersRepository = new UsersRepository(
      dataSource.getRepository(UserEntity),
      dataSource.getRepository(UserRoleEntity),
      dataSource.getRepository(SectorUserEntity),
    );
  }, 60000);

  afterAll(async () => {
    await dataSource.destroy();
    await stopContainers(containers);
  });

  beforeEach(async () => {
    await cleanDatabase(dataSource);
  });

  describe('findByEmail / findByUuid', () => {
    it('finds an existing user by uuid', async () => {
      const user = await usersRepository.create(buildUser({ name: 'Ada Lovelace' }));

      const found = await usersRepository.findByUuid(user.uuid);

      expect(found).not.toBeNull();
      expect(found?.name).toBe('Ada Lovelace');
    });

    it('finds an existing user by email', async () => {
      const user = await usersRepository.create(buildUser({ email: 'ada@example.com' }));

      const found = await usersRepository.findByEmail(user.email);

      expect(found).not.toBeNull();
      expect(found?.uuid).toBe(user.uuid);
    });

    it('returns null for a uuid that does not exist', async () => {
      const found = await usersRepository.findByUuid('00000000-0000-4000-8000-000000000000');

      expect(found).toBeNull();
    });

    it('returns null for an email that does not exist', async () => {
      const found = await usersRepository.findByEmail('nobody@example.com');

      expect(found).toBeNull();
    });

    it('does not return a soft-deleted user via findByUuid', async () => {
      const user = await usersRepository.create(buildUser());

      await usersRepository.softDelete(user.id);

      const found = await usersRepository.findByUuid(user.uuid);

      expect(found).toBeNull();
    });

    it('does not return a soft-deleted user via findByEmail', async () => {
      const user = await usersRepository.create(buildUser());

      await usersRepository.softDelete(user.id);

      const found = await usersRepository.findByEmail(user.email);

      expect(found).toBeNull();
    });
  });

  describe('findByUuidWithPassword / findByEmailWithPassword', () => {
    it('populates passwordHash when fetching by uuid with password', async () => {
      const built = buildUser();
      const user = await usersRepository.create(built);

      const found = await usersRepository.findByUuidWithPassword(user.uuid);

      expect(found).not.toBeNull();
      // `create()` returns via `findByUuid`, which never selects `passwordHash`
      // (the column is `select: false`), so the saved hash is asserted against
      // the plain object built by the factory rather than `user.passwordHash`.
      expect(found?.passwordHash).toBe(built.passwordHash);
    });

    it('populates passwordHash when fetching by email with password', async () => {
      const built = buildUser();
      const user = await usersRepository.create(built);

      const found = await usersRepository.findByEmailWithPassword(user.email);

      expect(found).not.toBeNull();
      expect(found?.passwordHash).toBe(built.passwordHash);
    });

    it('does not populate passwordHash on the plain findByUuid lookup', async () => {
      const user = await usersRepository.create(buildUser());

      const found = await usersRepository.findByUuid(user.uuid);

      expect(found?.passwordHash).toBeUndefined();
    });
  });

  describe('search', () => {
    it('filters by email (partial, case-insensitive)', async () => {
      await usersRepository.create(buildUser({ email: 'alice@example.com' }));
      await usersRepository.create(buildUser({ email: 'bob@example.com' }));
      await usersRepository.create(buildUser({ email: 'charlie@test.com' }));

      const result = await usersRepository.search(1, 20, { search: 'ALICE' });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].email).toBe('alice@example.com');
    });

    it('filters by status', async () => {
      await usersRepository.create(buildUser({ status: EUserStatus.ACTIVE }));
      await usersRepository.create(buildUser({ status: EUserStatus.INACTIVE }));
      await usersRepository.create(buildUser({ status: EUserStatus.PENDING }));

      const result = await usersRepository.search(1, 20, { status: EUserStatus.INACTIVE });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].status).toBe(EUserStatus.INACTIVE);
    });

    it('filters by roleUuid, only returning users assigned to that role', async () => {
      const roleRepo = dataSource.getRepository(RoleEntity);
      const role = await roleRepo.save(buildRole({ name: 'search-role-filter' }));
      const otherRole = await roleRepo.save(buildRole({ name: 'search-role-other' }));

      const withRole = await usersRepository.create(buildUser({ email: 'with-role@example.com' }));
      const withOtherRole = await usersRepository.create(
        buildUser({ email: 'with-other-role@example.com' }),
      );
      await usersRepository.create(buildUser({ email: 'without-role@example.com' }));

      await usersRepository.setRoles(withRole.id, [role.id]);
      await usersRepository.setRoles(withOtherRole.id, [otherRole.id]);

      const result = await usersRepository.search(1, 20, { roleUuid: role.uuid });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].uuid).toBe(withRole.uuid);
    });

    it('paginates results and reports the correct total', async () => {
      await usersRepository.create(buildUser({ email: 'a-user@example.com' }));
      await usersRepository.create(buildUser({ email: 'b-user@example.com' }));
      await usersRepository.create(buildUser({ email: 'c-user@example.com' }));

      const firstPage = await usersRepository.search(1, 2, {});
      const secondPage = await usersRepository.search(2, 2, {});

      expect(firstPage.data).toHaveLength(2);
      expect(firstPage.meta.total).toBe(3);
      expect(firstPage.meta.lastPage).toBe(2);

      expect(secondPage.data).toHaveLength(1);
      expect(secondPage.meta.total).toBe(3);

      // Ordered by email ASC, so pages should not overlap.
      const allEmails = [...firstPage.data, ...secondPage.data].map((u) => u.email);
      expect(new Set(allEmails).size).toBe(3);
    });

    it('excludes soft-deleted users', async () => {
      const user = await usersRepository.create(buildUser({ email: 'deleted@example.com' }));
      await usersRepository.softDelete(user.id);

      const result = await usersRepository.search(1, 20, {});

      expect(result.data.find((u) => u.uuid === user.uuid)).toBeUndefined();
    });
  });

  describe('create', () => {
    it('saves the user and returns it with relations loaded', async () => {
      const created = await usersRepository.create(buildUser({ name: 'New User' }));

      expect(created.id).toBeGreaterThan(0);
      expect(created.name).toBe('New User');
      expect(created.userRoles).toEqual([]);
    });
  });

  describe('update', () => {
    it('applies only the passed fields, leaving the rest untouched', async () => {
      const user = await usersRepository.create(
        buildUser({ name: 'Original Name', institutionalId: 'REG-001' }),
      );

      const updated = await usersRepository.update(user.id, { name: 'Updated Name' });

      expect(updated.name).toBe('Updated Name');
      expect(updated.email).toBe(user.email);
      expect(updated.institutionalId).toBe('REG-001');
    });
  });

  describe('softDelete', () => {
    it('marks the user as deleted', async () => {
      const user = await usersRepository.create(buildUser());

      await usersRepository.softDelete(user.id);

      const found = await usersRepository.findByUuid(user.uuid);
      expect(found).toBeNull();
    });

    it('is idempotent when the user does not exist', async () => {
      await expect(usersRepository.softDelete(999_999)).resolves.toBeUndefined();
    });
  });

  describe('setRoles', () => {
    it('fully replaces the set of roles assigned to a user', async () => {
      const roleRepo = dataSource.getRepository(RoleEntity);
      const roleA = await roleRepo.save(buildRole({ name: 'set-roles-a' }));
      const roleB = await roleRepo.save(buildRole({ name: 'set-roles-b' }));
      const roleC = await roleRepo.save(buildRole({ name: 'set-roles-c' }));

      const user = await usersRepository.create(buildUser());

      await usersRepository.setRoles(user.id, [roleA.id, roleB.id]);

      const afterFirstSet = await usersRepository.findByUuid(user.uuid);
      const firstRoleIds = afterFirstSet?.userRoles.map((ur) => ur.roleId).sort();
      expect(firstRoleIds).toEqual([roleA.id, roleB.id].sort());

      await usersRepository.setRoles(user.id, [roleC.id]);

      const afterSecondSet = await usersRepository.findByUuid(user.uuid);
      const secondRoleIds = afterSecondSet?.userRoles.map((ur) => ur.roleId);
      expect(secondRoleIds).toEqual([roleC.id]);
    });
  });
});
