import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { v7 as uuidv7 } from 'uuid';

import { ROLE_ADMIN } from '@shared/constants';

import { PermissionEntity } from '@modules/roles/entities/permission.entity';
import { RoleEntity } from '@modules/roles/entities/role.entity';
import { SectorUserEntity } from '@modules/users/entities/sector-user.entity';
import { UserRoleEntity } from '@modules/users/entities/user-role.entity';
import { UserEntity } from '@modules/users/entities/user.entity';
import { UsersRepository } from '@modules/users/repositories/users.repository';

import { AdminSeeder, PermissionsSeeder, RolesSeeder } from '../../src/core/database/seeds';
import { ILoginAsResult, loginAs } from '../support/auth.helper';
import { ITestContainers, startContainers, stopContainers } from '../support/containers';
import { DEFAULT_PASSWORD, buildPermission, buildUser } from '../support/entity-factories';
import { bootstrapTestApp } from '../support/test-app.helper';
import { createTestDataSource } from '../support/test-data-source';

const ADMIN_EMAIL = 'admin@e2e-test.local';
const ADMIN_PASSWORD = 'AdminTest@123';

describe('Roles (e2e)', () => {
  let containers: ITestContainers;
  let dataSource: DataSource;
  let app: INestApplication;
  let admin: ILoginAsResult;

  beforeAll(async () => {
    containers = await startContainers();
    dataSource = await createTestDataSource(containers.postgres);

    process.env.ADMIN_EMAIL = ADMIN_EMAIL;
    process.env.ADMIN_PASSWORD = ADMIN_PASSWORD;

    await new PermissionsSeeder(dataSource).run();
    await new RolesSeeder(dataSource).run();
    await new AdminSeeder(dataSource).run();

    app = await bootstrapTestApp({
      dbHost: containers.postgres.getHost(),
      dbPort: containers.postgres.getPort(),
      dbUsername: containers.postgres.getUsername(),
      dbPassword: containers.postgres.getPassword(),
      dbName: containers.postgres.getDatabase(),
      redisHost: containers.redis.getHost(),
      redisPort: containers.redis.getPort(),
    });

    admin = await loginAs(app, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  }, 60000);

  afterAll(async () => {
    await app.close();
    await dataSource.destroy();
    await stopContainers(containers);
  });

  describe('POST /api/v1/roles', () => {
    it('creates a role', async () => {
      const response = await admin.agent
        .post('/api/v1/roles')
        .set(admin.csrfHeader)
        .send({ name: 'role-create-e2e', description: 'A role created in e2e tests' })
        .expect(201);

      const body = response.body.data;

      expect(body.uuid).toBeDefined();
      expect(body.name).toBe('role-create-e2e');
      expect(body.description).toBe('A role created in e2e tests');
      expect(body.isReserved).toBe(false);
      expect(body.permissions).toEqual([]);
    });

    it('rejects duplicate name with 409', async () => {
      await admin.agent
        .post('/api/v1/roles')
        .set(admin.csrfHeader)
        .send({ name: 'role-dup-e2e' })
        .expect(201);

      await admin.agent
        .post('/api/v1/roles')
        .set(admin.csrfHeader)
        .send({ name: 'role-dup-e2e' })
        .expect(409);
    });

    it('rejects a name shorter than 2 characters', async () => {
      await admin.agent.post('/api/v1/roles').set(admin.csrfHeader).send({ name: 'a' }).expect(400);
    });
  });

  describe('GET /api/v1/roles', () => {
    it('paginates results', async () => {
      await admin.agent
        .post('/api/v1/roles')
        .set(admin.csrfHeader)
        .send({ name: 'pagination-role-1-e2e' })
        .expect(201);
      await admin.agent
        .post('/api/v1/roles')
        .set(admin.csrfHeader)
        .send({ name: 'pagination-role-2-e2e' })
        .expect(201);
      await admin.agent
        .post('/api/v1/roles')
        .set(admin.csrfHeader)
        .send({ name: 'pagination-role-3-e2e' })
        .expect(201);

      const firstPage = await admin.agent
        .get('/api/v1/roles')
        .query({ search: 'pagination-role', page: 1, perPage: 2 })
        .expect(200);

      expect(firstPage.body.data.data).toHaveLength(2);
      expect(firstPage.body.data.meta).toMatchObject({ total: 3, page: 1, perPage: 2 });

      const secondPage = await admin.agent
        .get('/api/v1/roles')
        .query({ search: 'pagination-role', page: 2, perPage: 2 })
        .expect(200);

      expect(secondPage.body.data.data).toHaveLength(1);
      expect(secondPage.body.data.meta).toMatchObject({ total: 3, page: 2, perPage: 2 });
    });

    it('searches by role name', async () => {
      await admin.agent
        .post('/api/v1/roles')
        .set(admin.csrfHeader)
        .send({ name: 'search-target-role-e2e' })
        .expect(201);

      const response = await admin.agent
        .get('/api/v1/roles')
        .query({ search: 'search-target-role-e2e' })
        .expect(200);

      expect(response.body.data.data).toHaveLength(1);
      expect(response.body.data.data[0].name).toBe('search-target-role-e2e');
    });

    // NOTE: the ListRoleDTO/`search` field is documented ("Search by role name
    // or description") as matching both name and description, but
    // `RolesRepository.findAll` only applies `ILike` to `name` - a role that
    // matches solely on description is not found. This test pins down the
    // actual (narrower) behavior; see the final report for the discrepancy.
    it('does not match on description alone (documented behavior differs from implementation)', async () => {
      await admin.agent
        .post('/api/v1/roles')
        .set(admin.csrfHeader)
        .send({
          name: 'description-only-role-e2e',
          description: 'unique-description-marker-e2e',
        })
        .expect(201);

      const response = await admin.agent
        .get('/api/v1/roles')
        .query({ search: 'unique-description-marker-e2e' })
        .expect(200);

      expect(response.body.data.data).toHaveLength(0);
    });
  });

  describe('GET /api/v1/roles/:uuid', () => {
    it('returns the role when it exists', async () => {
      const created = await admin.agent
        .post('/api/v1/roles')
        .set(admin.csrfHeader)
        .send({ name: 'find-role-e2e' })
        .expect(201);

      const response = await admin.agent.get(`/api/v1/roles/${created.body.data.uuid}`).expect(200);

      expect(response.body.data.uuid).toBe(created.body.data.uuid);
      expect(response.body.data.name).toBe('find-role-e2e');
    });

    it('returns 404 for a well-formed but unknown uuid', async () => {
      await admin.agent.get(`/api/v1/roles/${uuidv7()}`).expect(404);
    });
  });

  describe('PATCH /api/v1/roles/:uuid', () => {
    it('partially updates a role', async () => {
      const created = await admin.agent
        .post('/api/v1/roles')
        .set(admin.csrfHeader)
        .send({ name: 'patch-role-e2e', description: 'original' })
        .expect(201);

      const response = await admin.agent
        .patch(`/api/v1/roles/${created.body.data.uuid}`)
        .set(admin.csrfHeader)
        .send({ description: 'updated' })
        .expect(200);

      expect(response.body.data.name).toBe('patch-role-e2e');
      expect(response.body.data.description).toBe('updated');
    });
  });

  describe('DELETE /api/v1/roles/:uuid', () => {
    it('deletes a non-reserved role', async () => {
      const created = await admin.agent
        .post('/api/v1/roles')
        .set(admin.csrfHeader)
        .send({ name: 'delete-role-e2e' })
        .expect(201);

      await admin.agent
        .delete(`/api/v1/roles/${created.body.data.uuid}`)
        .set(admin.csrfHeader)
        .expect(204);

      await admin.agent.get(`/api/v1/roles/${created.body.data.uuid}`).expect(404);
    });

    it('refuses to delete a reserved role (403, not a 4xx "not found"/"conflict")', async () => {
      const adminRole = await dataSource.getRepository(RoleEntity).findOneBy({ name: ROLE_ADMIN });

      expect(adminRole?.isReserved).toBe(true);

      await admin.agent
        .delete(`/api/v1/roles/${adminRole!.uuid}`)
        .set(admin.csrfHeader)
        .expect(403);
    });
  });

  describe('PUT /api/v1/roles/:uuid/permissions', () => {
    it('fully replaces the permission set (not additive)', async () => {
      const created = await admin.agent
        .post('/api/v1/roles')
        .set(admin.csrfHeader)
        .send({ name: 'permissions-role-e2e' })
        .expect(201);
      const roleUuid = created.body.data.uuid;

      const permRepo = dataSource.getRepository(PermissionEntity);
      const permA = await permRepo.save(buildPermission({ resource: 'widgets', action: 'manage' }));
      const permB = await permRepo.save(
        buildPermission({ resource: 'widgets', action: 'archive' }),
      );
      const permC = await permRepo.save(
        buildPermission({ resource: 'widgets', action: 'restore' }),
      );

      const firstUpdate = await admin.agent
        .put(`/api/v1/roles/${roleUuid}/permissions`)
        .set(admin.csrfHeader)
        .send({
          permissions: [
            { resource: permA.resource, action: permA.action },
            { resource: permB.resource, action: permB.action },
          ],
        })
        .expect(200);

      const firstKeys = firstUpdate.body.data.permissions
        .map((p: { resource: string; action: string }) => `${p.resource}:${p.action}`)
        .sort();
      expect(firstKeys).toEqual(['widgets:archive', 'widgets:manage']);

      // Replace again with a disjoint single permission: the response must
      // reflect ONLY permC, proving this is a full replace, not a merge.
      const secondUpdate = await admin.agent
        .put(`/api/v1/roles/${roleUuid}/permissions`)
        .set(admin.csrfHeader)
        .send({ permissions: [{ resource: permC.resource, action: permC.action }] })
        .expect(200);

      const secondKeys = secondUpdate.body.data.permissions.map(
        (p: { resource: string; action: string }) => `${p.resource}:${p.action}`,
      );
      expect(secondKeys).toEqual(['widgets:restore']);
    });

    it('returns 404 when a given resource/action pair does not exist', async () => {
      const created = await admin.agent
        .post('/api/v1/roles')
        .set(admin.csrfHeader)
        .send({ name: 'permissions-role-missing-pair-e2e' })
        .expect(201);

      await admin.agent
        .put(`/api/v1/roles/${created.body.data.uuid}/permissions`)
        .set(admin.csrfHeader)
        .send({ permissions: [{ resource: 'does-not-exist', action: 'nope' }] })
        .expect(404);
    });
  });

  describe('POST /api/v1/roles/:uuid/clone', () => {
    it('clones a role with the same permissions but a new identity', async () => {
      const adminRole = await dataSource
        .getRepository(RoleEntity)
        .findOne({ where: { name: ROLE_ADMIN }, relations: { permissions: true } });

      expect(adminRole).not.toBeNull();
      expect(adminRole!.permissions.length).toBeGreaterThan(0);

      const response = await admin.agent
        .post(`/api/v1/roles/${adminRole!.uuid}/clone`)
        .set(admin.csrfHeader)
        .send({ name: 'admin-clone-e2e' })
        .expect(201);

      const clone = response.body.data;

      expect(clone.uuid).not.toBe(adminRole!.uuid);
      expect(clone.name).toBe('admin-clone-e2e');
      // The clone itself is a brand-new, non-reserved role - only its
      // permission SET is copied, not the `isReserved` flag.
      expect(clone.isReserved).toBe(false);

      const originalKeys = adminRole!.permissions.map((p) => `${p.resource}:${p.action}`).sort();
      const cloneKeys = clone.permissions
        .map((p: { resource: string; action: string }) => `${p.resource}:${p.action}`)
        .sort();

      expect(cloneKeys).toEqual(originalKeys);
    });

    it('returns 404 when cloning an unknown role', async () => {
      await admin.agent
        .post(`/api/v1/roles/${uuidv7()}/clone`)
        .set(admin.csrfHeader)
        .send({ name: 'clone-of-nothing-e2e' })
        .expect(404);
    });

    it('returns 409 when the clone name already exists', async () => {
      const adminRole = await dataSource.getRepository(RoleEntity).findOneBy({ name: ROLE_ADMIN });

      await admin.agent
        .post(`/api/v1/roles/${adminRole!.uuid}/clone`)
        .set(admin.csrfHeader)
        .send({ name: ROLE_ADMIN })
        .expect(409);
    });
  });

  describe('authorization', () => {
    it('returns 403 for a user with no roles/permissions', async () => {
      const usersRepository = new UsersRepository(
        dataSource.getRepository(UserEntity),
        dataSource.getRepository(UserRoleEntity),
        dataSource.getRepository(SectorUserEntity),
      );
      const user = await usersRepository.create(buildUser());

      const noPermissions = await loginAs(app, {
        email: user.email,
        password: DEFAULT_PASSWORD,
      });

      await noPermissions.agent.get('/api/v1/roles').expect(403);
    });
  });
});
