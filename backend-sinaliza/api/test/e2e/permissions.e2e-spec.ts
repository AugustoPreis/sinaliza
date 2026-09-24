import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { v7 as uuidv7 } from 'uuid';

import { PermissionEntity } from '@modules/roles/entities/permission.entity';
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

describe('Permissions (e2e)', () => {
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

  describe('POST /api/v1/permissions', () => {
    it('creates a permission', async () => {
      const response = await admin.agent
        .post('/api/v1/permissions')
        .set(admin.csrfHeader)
        .send({ resource: 'widgets', action: 'archive', description: 'Archive widgets' })
        .expect(201);

      const body = response.body.data;

      expect(body.uuid).toBeDefined();
      expect(body.resource).toBe('widgets');
      expect(body.action).toBe('archive');
      expect(body.description).toBe('Archive widgets');
    });

    it('rejects a duplicate resource/action pair with 409', async () => {
      await admin.agent
        .post('/api/v1/permissions')
        .set(admin.csrfHeader)
        .send({ resource: 'billing', action: 'view' })
        .expect(201);

      await admin.agent
        .post('/api/v1/permissions')
        .set(admin.csrfHeader)
        .send({ resource: 'billing', action: 'view' })
        .expect(409);
    });

    it('rejects resource/action values that are not [a-z_] only', async () => {
      await admin.agent
        .post('/api/v1/permissions')
        .set(admin.csrfHeader)
        .send({ resource: 'not-valid', action: 'read' })
        .expect(400);

      await admin.agent
        .post('/api/v1/permissions')
        .set(admin.csrfHeader)
        .send({ resource: 'valid', action: 'Not Valid' })
        .expect(400);
    });
  });

  describe('GET /api/v1/permissions', () => {
    it('paginates results', async () => {
      const permRepo = dataSource.getRepository(PermissionEntity);
      await permRepo.save(buildPermission({ resource: 'pagination_res', action: 'one' }));
      await permRepo.save(buildPermission({ resource: 'pagination_res', action: 'two' }));
      await permRepo.save(buildPermission({ resource: 'pagination_res', action: 'three' }));

      const firstPage = await admin.agent
        .get('/api/v1/permissions')
        .query({ resource: 'pagination_res', page: 1, perPage: 2 })
        .expect(200);

      expect(firstPage.body.data.data).toHaveLength(2);
      expect(firstPage.body.data.meta).toMatchObject({ total: 3, page: 1, perPage: 2 });

      const secondPage = await admin.agent
        .get('/api/v1/permissions')
        .query({ resource: 'pagination_res', page: 2, perPage: 2 })
        .expect(200);

      expect(secondPage.body.data.data).toHaveLength(1);
      expect(secondPage.body.data.meta).toMatchObject({ total: 3, page: 2, perPage: 2 });
    });

    it('filters by resource (exact match, not a substring/ILike search)', async () => {
      const permRepo = dataSource.getRepository(PermissionEntity);
      await permRepo.save(buildPermission({ resource: 'inventory_e2e', action: 'count' }));

      const exact = await admin.agent
        .get('/api/v1/permissions')
        .query({ resource: 'inventory_e2e' })
        .expect(200);

      expect(exact.body.data.data).toHaveLength(1);
      expect(exact.body.data.data[0].resource).toBe('inventory_e2e');

      const partial = await admin.agent
        .get('/api/v1/permissions')
        .query({ resource: 'inventory' })
        .expect(200);

      expect(partial.body.data.data).toHaveLength(0);
    });
  });

  describe('GET /api/v1/permissions/:uuid', () => {
    it('returns the permission when it exists', async () => {
      const created = await admin.agent
        .post('/api/v1/permissions')
        .set(admin.csrfHeader)
        .send({ resource: 'find_res', action: 'lookup' })
        .expect(201);

      const response = await admin.agent
        .get(`/api/v1/permissions/${created.body.data.uuid}`)
        .expect(200);

      expect(response.body.data.uuid).toBe(created.body.data.uuid);
      expect(response.body.data.resource).toBe('find_res');
      expect(response.body.data.action).toBe('lookup');
    });

    it('returns 404 for a well-formed but unknown uuid', async () => {
      await admin.agent.get(`/api/v1/permissions/${uuidv7()}`).expect(404);
    });
  });

  describe('PATCH /api/v1/permissions/:uuid', () => {
    it('partially updates a permission', async () => {
      const created = await admin.agent
        .post('/api/v1/permissions')
        .set(admin.csrfHeader)
        .send({ resource: 'patch_res', action: 'update_it', description: 'original' })
        .expect(201);

      const response = await admin.agent
        .patch(`/api/v1/permissions/${created.body.data.uuid}`)
        .set(admin.csrfHeader)
        .send({ description: 'updated' })
        .expect(200);

      expect(response.body.data.resource).toBe('patch_res');
      expect(response.body.data.action).toBe('update_it');
      expect(response.body.data.description).toBe('updated');
    });

    it('rejects an update that collides with another existing resource/action pair (409)', async () => {
      await admin.agent
        .post('/api/v1/permissions')
        .set(admin.csrfHeader)
        .send({ resource: 'conflict_res', action: 'first' })
        .expect(201);
      const second = await admin.agent
        .post('/api/v1/permissions')
        .set(admin.csrfHeader)
        .send({ resource: 'conflict_res', action: 'second' })
        .expect(201);

      await admin.agent
        .patch(`/api/v1/permissions/${second.body.data.uuid}`)
        .set(admin.csrfHeader)
        .send({ action: 'first' })
        .expect(409);
    });
  });

  describe('DELETE /api/v1/permissions/:uuid', () => {
    it('deletes a permission', async () => {
      const created = await admin.agent
        .post('/api/v1/permissions')
        .set(admin.csrfHeader)
        .send({ resource: 'delete_res', action: 'gone' })
        .expect(201);

      await admin.agent
        .delete(`/api/v1/permissions/${created.body.data.uuid}`)
        .set(admin.csrfHeader)
        .expect(204);

      await admin.agent.get(`/api/v1/permissions/${created.body.data.uuid}`).expect(404);
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

      await noPermissions.agent.get('/api/v1/permissions').expect(403);
    });
  });
});
