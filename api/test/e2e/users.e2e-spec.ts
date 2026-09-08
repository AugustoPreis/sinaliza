import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { AdminSeeder, PermissionsSeeder, RolesSeeder } from '../../src/core/database/seeds';
import { RoleEntity } from '../../src/modules/roles/entities/role.entity';
import { UserEntity } from '../../src/modules/users/entities/user.entity';
import { EUserStatus } from '../../src/modules/users/enums/user-status.enum';
import { ILoginAsResult, loginAs } from '../support/auth.helper';
import { ITestContainers, startContainers, stopContainers } from '../support/containers';
import { buildRole, buildUser } from '../support/entity-factories';
import { bootstrapTestApp } from '../support/test-app.helper';
import { createTestDataSource } from '../support/test-data-source';

const ADMIN_EMAIL = 'admin@e2e-test.local';
const ADMIN_PASSWORD = 'AdminTest@123';

// `POST /auth/login` is throttled to 5 requests per 15 minutes (see
// AuthController), tracked per-IP with an in-memory store scoped to this
// app instance. Every test in this file that needs a session reuses one of
// the sessions logged in here rather than logging in again, to stay well
// under that ceiling: admin, a role-less user (used for every 403 check),
// and a plain "owner" user (used for the me/password and me/avatar tests,
// whose access token stays valid across the password change). Only the
// final "new password works" assertion needs one extra login call.
describe('Users (e2e)', () => {
  let containers: ITestContainers;
  let dataSource: DataSource;
  let app: INestApplication;
  let admin: ILoginAsResult;
  let noRole: ILoginAsResult;
  let owner: ILoginAsResult;
  let ownerEmail: string;

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

    const noRoleUser = buildUser({ email: 'no-role@example.com', password: 'Password@123' });
    await dataSource.getRepository(UserEntity).save(noRoleUser);
    noRole = await loginAs(app, { email: noRoleUser.email, password: 'Password@123' });

    ownerEmail = 'owner@example.com';
    const ownerUser = buildUser({ email: ownerEmail, password: 'Password@123' });
    await dataSource.getRepository(UserEntity).save(ownerUser);
    owner = await loginAs(app, { email: ownerEmail, password: 'Password@123' });
  }, 60000);

  afterAll(async () => {
    await app.close();
    await dataSource.destroy();
    await stopContainers(containers);
  });

  describe('POST /api/v1/users', () => {
    it('creates a user and never exposes the password hash', async () => {
      const response = await admin.agent
        .post('/api/v1/users')
        .set(admin.csrfHeader)
        .send({ email: 'created-user@example.com', name: 'Created User', password: 'Password@123' })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe('created-user@example.com');
      expect(response.body.data.name).toBe('Created User');
      expect(response.body.data.status).toBe(EUserStatus.ACTIVE);
      expect(response.body.data.roles).toEqual([]);
      expect(response.body.data).not.toHaveProperty('passwordHash');
      expect(response.body.data).not.toHaveProperty('password');
    });

    it('assigns the given roles on creation', async () => {
      const roleRepo = dataSource.getRepository(RoleEntity);
      const role = await roleRepo.save(buildRole({ name: 'create-with-role' }));

      const response = await admin.agent
        .post('/api/v1/users')
        .set(admin.csrfHeader)
        .send({
          email: 'created-with-role@example.com',
          name: 'Created With Role',
          password: 'Password@123',
          roleUuids: [role.uuid],
        })
        .expect(201);

      expect(response.body.data.roles).toHaveLength(1);
      expect(response.body.data.roles[0].uuid).toBe(role.uuid);
    });

    it('rejects a duplicate email', async () => {
      await admin.agent
        .post('/api/v1/users')
        .set(admin.csrfHeader)
        .send({ email: 'duplicate@example.com', name: 'First', password: 'Password@123' })
        .expect(201);

      const response = await admin.agent
        .post('/api/v1/users')
        .set(admin.csrfHeader)
        .send({ email: 'duplicate@example.com', name: 'Second', password: 'Password@123' })
        .expect(409);

      expect(response.body.success).toBe(false);
    });

    it('rejects a weak password', async () => {
      await admin.agent
        .post('/api/v1/users')
        .set(admin.csrfHeader)
        .send({ email: 'weak-password@example.com', name: 'Weak Password', password: 'weak' })
        .expect(400);
    });

    it('rejects the mutation without a valid CSRF header', async () => {
      await admin.agent
        .post('/api/v1/users')
        .send({ email: 'no-csrf@example.com', name: 'No Csrf', password: 'Password@123' })
        .expect(403);

      await admin.agent
        .post('/api/v1/users')
        .set({ 'x-xsrf-token': 'not-the-real-token' })
        .send({ email: 'wrong-csrf@example.com', name: 'Wrong Csrf', password: 'Password@123' })
        .expect(403);
    });

    it('rejects the request when the caller lacks the users:create permission', async () => {
      await noRole.agent
        .post('/api/v1/users')
        .set(noRole.csrfHeader)
        .send({ email: 'blocked@example.com', name: 'Blocked', password: 'Password@123' })
        .expect(403);
    });
  });

  describe('GET /api/v1/users', () => {
    it('lists users with pagination metadata', async () => {
      await dataSource.getRepository(UserEntity).save(buildUser({ email: 'list-a@example.com' }));
      await dataSource.getRepository(UserEntity).save(buildUser({ email: 'list-b@example.com' }));

      const response = await admin.agent
        .get('/api/v1/users')
        .set(admin.csrfHeader)
        .query({ page: 1, perPage: 1 })
        .expect(200);

      expect(response.body.data.data).toHaveLength(1);
      expect(response.body.data.meta.perPage).toBe(1);
      expect(response.body.data.meta.total).toBeGreaterThanOrEqual(2);
    });

    it('filters by search (name or email, partial match)', async () => {
      await dataSource
        .getRepository(UserEntity)
        .save(buildUser({ email: 'filter-target@example.com' }));

      const response = await admin.agent
        .get('/api/v1/users')
        .set(admin.csrfHeader)
        .query({ search: 'filter-target' })
        .expect(200);

      expect(
        response.body.data.data.every((u: { email: string }) => u.email.includes('filter-target')),
      ).toBe(true);
    });

    it('filters by status', async () => {
      await dataSource
        .getRepository(UserEntity)
        .save(buildUser({ email: 'inactive-filter@example.com', status: EUserStatus.INACTIVE }));

      const response = await admin.agent
        .get('/api/v1/users')
        .set(admin.csrfHeader)
        .query({ status: EUserStatus.INACTIVE })
        .expect(200);

      expect(
        response.body.data.data.every(
          (u: { status: EUserStatus }) => u.status === EUserStatus.INACTIVE,
        ),
      ).toBe(true);
    });

    it('rejects the request when the caller lacks the users:read permission', async () => {
      await noRole.agent.get('/api/v1/users').set(noRole.csrfHeader).expect(403);
    });
  });

  describe('GET /api/v1/users/:uuid', () => {
    it('returns the user for a valid uuid', async () => {
      const user = await dataSource
        .getRepository(UserEntity)
        .save(buildUser({ email: 'find-me@example.com' }));

      const response = await admin.agent.get(`/api/v1/users/${user.uuid}`).expect(200);

      expect(response.body.data.uuid).toBe(user.uuid);
      expect(response.body.data.email).toBe('find-me@example.com');
    });

    it('returns 404 for a well-formed uuid that does not exist', async () => {
      await admin.agent.get('/api/v1/users/00000000-0000-4000-8000-000000000000').expect(404);
    });

    it('returns 400 for a malformed uuid', async () => {
      await admin.agent.get('/api/v1/users/not-a-uuid').expect(400);
    });
  });

  describe('PATCH /api/v1/users/:uuid', () => {
    it('updates only the provided fields', async () => {
      const user = await dataSource
        .getRepository(UserEntity)
        .save(buildUser({ email: 'patch-me@example.com', name: 'Original Name' }));

      const response = await admin.agent
        .patch(`/api/v1/users/${user.uuid}`)
        .set(admin.csrfHeader)
        .send({ name: 'Patched Name' })
        .expect(200);

      expect(response.body.data.name).toBe('Patched Name');
      expect(response.body.data.email).toBe('patch-me@example.com');
    });
  });

  describe('POST /api/v1/admin/users/:uuid/revoke', () => {
    it('revokes access without deleting the user', async () => {
      const user = await dataSource
        .getRepository(UserEntity)
        .save(buildUser({ email: 'revoke-me@example.com', status: EUserStatus.ACTIVE }));

      const response = await admin.agent
        .post(`/api/v1/admin/users/${user.uuid}/revoke`)
        .set(admin.csrfHeader)
        .send({})
        .expect(200);

      expect(response.body.data).toEqual({ id: user.uuid, access_revoked: true });
    });
  });

  describe('POST /api/v1/admin/users/:uuid/restore', () => {
    it('restores a previously revoked user', async () => {
      const user = await dataSource
        .getRepository(UserEntity)
        .save(buildUser({ email: 'restore-me@example.com', status: EUserStatus.INACTIVE }));

      const response = await admin.agent
        .post(`/api/v1/admin/users/${user.uuid}/restore`)
        .set(admin.csrfHeader)
        .expect(200);

      expect(response.body.data).toEqual({ id: user.uuid, access_revoked: false });
    });
  });

  describe('DELETE /api/v1/users/:uuid', () => {
    it('soft-deletes the user, hiding it from list and detail endpoints', async () => {
      const user = await dataSource
        .getRepository(UserEntity)
        .save(buildUser({ email: 'delete-me@example.com' }));

      await admin.agent.delete(`/api/v1/users/${user.uuid}`).set(admin.csrfHeader).expect(204);

      await admin.agent.get(`/api/v1/users/${user.uuid}`).expect(404);

      const listResponse = await admin.agent
        .get('/api/v1/users')
        .query({ search: 'delete-me' })
        .expect(200);

      expect(
        listResponse.body.data.data.find((u: { uuid: string }) => u.uuid === user.uuid),
      ).toBeUndefined();
    });
  });

  describe('PATCH /api/v1/admin/users/:uuid/permissions', () => {
    it('replaces the roles and sectors assigned to the user', async () => {
      const roleRepo = dataSource.getRepository(RoleEntity);
      const roleA = await roleRepo.save(buildRole({ name: 'assign-role-a' }));

      const user = await dataSource
        .getRepository(UserEntity)
        .save(buildUser({ email: 'assign-roles@example.com' }));

      const response = await admin.agent
        .patch(`/api/v1/admin/users/${user.uuid}/permissions`)
        .set(admin.csrfHeader)
        .send({ roles: [roleA.name], sector_ids: [] })
        .expect(200);

      expect(response.body.data).toEqual({ id: user.uuid, roles: [roleA.name], sector_ids: [] });
    });
  });

  describe('PUT /api/v1/users/me/password', () => {
    it('rejects the wrong current password', async () => {
      await owner.agent
        .put('/api/v1/users/me/password')
        .set(owner.csrfHeader)
        .send({
          currentPassword: 'WrongPassword@123',
          newPassword: 'NewPassword@123',
          confirmNewPassword: 'NewPassword@123',
        })
        .expect(400);
    });

    it('changes the password so the new one can be used to log in', async () => {
      await owner.agent
        .put('/api/v1/users/me/password')
        .set(owner.csrfHeader)
        .send({
          currentPassword: 'Password@123',
          newPassword: 'NewPassword@123',
          confirmNewPassword: 'NewPassword@123',
        })
        .expect(204);

      // The only extra login in this file: proves the new password actually
      // works, on top of the endpoint returning 204. The already-established
      // `owner` session below keeps working regardless (its access token is
      // untouched by the password change, only the refresh token is revoked).
      await loginAs(app, { email: ownerEmail, password: 'NewPassword@123' });
    });
  });

});
