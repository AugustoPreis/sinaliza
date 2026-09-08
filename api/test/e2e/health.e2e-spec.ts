import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';

import { AdminSeeder, PermissionsSeeder, RolesSeeder } from '../../src/core/database/seeds';
import { ITestContainers, startContainers, stopContainers } from '../support/containers';
import { bootstrapTestApp } from '../support/test-app.helper';
import { createTestDataSource } from '../support/test-data-source';

describe('Health (e2e)', () => {
  let containers: ITestContainers;
  let dataSource: DataSource;
  let app: INestApplication;

  beforeAll(async () => {
    containers = await startContainers();
    dataSource = await createTestDataSource(containers.postgres);

    process.env.ADMIN_EMAIL = 'admin@e2e-test.local';
    process.env.ADMIN_PASSWORD = 'AdminTest@123';

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
  }, 60000);

  afterAll(async () => {
    await app.close();
    await dataSource.destroy();
    await stopContainers(containers);
  });

  it('reports ok with real Postgres and Redis, without requiring authentication', async () => {
    // No cookie jar, no Authorization header: a bare `request(...)` call
    // with nothing attached that would identify a session, proving the
    // route works unauthenticated (it is annotated with @Public()).
    const response = await request(app.getHttpServer()).get('/api/v1/health').expect(200);

    // Every response is wrapped by the global ResponseInterceptor in
    // { success, data, timestamp } — the health payload lives under `data`.
    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe('ok');
    expect(response.body.data.checks.database).toBe('ok');
    expect(response.body.data.checks.redis).toBe('ok');
    expect(typeof response.body.data.uptime).toBe('number');
    expect(() => new Date(response.body.data.timestamp).toISOString()).not.toThrow();
  });
});
