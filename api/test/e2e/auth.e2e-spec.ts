import { getQueueToken } from '@nestjs/bullmq';
import { INestApplication } from '@nestjs/common';
import { Queue } from 'bullmq';
import request from 'supertest';
import { DataSource } from 'typeorm';

import { MAIL_QUEUE_NAME } from '@core/mail/mail.constants';
import { MailerService } from '@core/mail/mailer.service';

import { XSRF_COOKIE_NAME, XSRF_HEADER_NAME } from '@shared/guards/csrf.guard';

import { AdminSeeder, PermissionsSeeder, RolesSeeder } from '../../src/core/database/seeds';
import { ITestContainers, startContainers, stopContainers } from '../support/containers';
import { bootstrapTestApp } from '../support/test-app.helper';
import { createTestDataSource } from '../support/test-data-source';

const ADMIN_EMAIL = 'admin@e2e-test.local';
const ADMIN_PASSWORD = 'AdminTest@123';

/**
 * `POST /auth/login` is `@Throttle({ default: { limit: 5, ttl: 900000 } })`
 * (5 requests per 15 minutes, per IP) — a limit shared by every request in
 * this file, success or failure alike, since the guard counts requests, not
 * outcomes. To stay under it, this spec logs in at most 5 times total:
 *   1. the "logs in with correct credentials" test, whose agent/cookies are
 *      then reused (no further login calls) across every `/me`, `/refresh`
 *      and `/logout` test below;
 *   2. wrong password;
 *   3. non-existent e-mail;
 *   4. login with the new password after reset;
 *   5. login with the old password after reset (expected to fail).
 * Tests below run in declaration order (Jest does not reorder/parallelize
 * `it` blocks within a file), which is what makes sharing one session safe.
 */
describe('Auth (e2e)', () => {
  let containers: ITestContainers;
  let dataSource: DataSource;
  let app: INestApplication;

  // Populated by the first test and reused by the ones that need an
  // authenticated session, to avoid additional calls to the throttled
  // /auth/login route.
  let sharedAgent: ReturnType<typeof request.agent>;
  let sharedCsrfHeader: Record<string, string>;

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

    // The real MailProcessor worker is wired up (only S3 is mocked by
    // bootstrapTestApp). Pausing the queue keeps this spec's "was the
    // e-mail enqueued?" assertions from ever letting a job through to a
    // real SMTP send attempt, which would hang (and stall `app.close()`)
    // trying to reach a mail server that doesn't exist in this test env.
    const mailQueue = app.get<Queue>(getQueueToken(MAIL_QUEUE_NAME));

    await mailQueue.pause();
  }, 60000);

  afterAll(async () => {
    await app.close();
    await dataSource.destroy();
    await stopContainers(containers);
  });

  describe('POST /auth/login', () => {
    it('logs in with the correct credentials, returning the user and setting session cookies', async () => {
      // Uses request.agent (not a bare `request(...)`) so this same session
      // can be reused by the /me, /refresh and /logout tests further down.
      sharedAgent = request.agent(app.getHttpServer());

      const response = await sharedAgent
        .post('/api/v1/auth/login')
        .send({ identifier: ADMIN_EMAIL, password: ADMIN_PASSWORD })
        .expect(200);

      // Envelope from the global ResponseInterceptor: { success, data, timestamp }.
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(ADMIN_EMAIL);

      const setCookieHeader = response.headers['set-cookie'] as unknown as string[];
      const cookieNames = setCookieHeader.map((cookie) => cookie.split('=')[0]);

      expect(cookieNames).toEqual(
        expect.arrayContaining(['access_token', 'refresh_token', XSRF_COOKIE_NAME]),
      );

      const xsrfCookie = setCookieHeader.find((cookie) =>
        cookie.startsWith(`${XSRF_COOKIE_NAME}=`),
      );
      const xsrfToken = xsrfCookie?.split(';')[0].split('=')[1];

      sharedCsrfHeader = xsrfToken ? { [XSRF_HEADER_NAME]: xsrfToken } : {};
    });

    it('rejects a wrong password with 401', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ identifier: ADMIN_EMAIL, password: 'not-the-right-password' })
        .expect(401);
    });

    it('rejects a non-existent e-mail with 401', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ identifier: 'nobody@e2e-test.local', password: ADMIN_PASSWORD })
        .expect(401);
    });
  });

  describe('GET /auth/me', () => {
    it('returns the current user when the access token cookie is valid', async () => {
      const response = await sharedAgent.get('/api/v1/auth/me').expect(200);

      expect(response.body.data.email).toBe(ADMIN_EMAIL);
    });

    it('rejects a request with no session cookie, since JwtAuthGuard is global', async () => {
      await request(app.getHttpServer()).get('/api/v1/auth/me').expect(401);
    });
  });

  describe('POST /auth/refresh', () => {
    it('issues new cookies from a valid refresh_token cookie, without needing the CSRF header', async () => {
      // @SkipCsrf() on the controller: no x-xsrf-token header attached here on purpose.
      const response = await sharedAgent.post('/api/v1/auth/refresh').expect(200);

      expect(response.body.data.user.email).toBe(ADMIN_EMAIL);

      const setCookieHeader = response.headers['set-cookie'] as unknown as string[];
      const cookieNames = setCookieHeader.map((cookie) => cookie.split('=')[0]);

      expect(cookieNames).toEqual(
        expect.arrayContaining(['access_token', 'refresh_token', XSRF_COOKIE_NAME]),
      );

      // /auth/refresh calls setAuthCookies() again, rotating the XSRF-TOKEN
      // cookie too. The header captured at login is now stale — re-capture
      // it here so the logout tests below send a token that matches the
      // cookie the agent is now holding.
      const xsrfCookie = setCookieHeader.find((cookie) =>
        cookie.startsWith(`${XSRF_COOKIE_NAME}=`),
      );
      const xsrfToken = xsrfCookie?.split(';')[0].split('=')[1];

      sharedCsrfHeader = xsrfToken ? { [XSRF_HEADER_NAME]: xsrfToken } : {};
    });
  });

  describe('POST /auth/logout', () => {
    it('requires the CSRF header, since logout is not @SkipCsrf()', async () => {
      // No x-xsrf-token header attached: the CsrfGuard (a global guard) must
      // reject this, and the session must remain valid for the next test.
      await sharedAgent.post('/api/v1/auth/logout').expect(403);
    });

    it('revokes the refresh token so a later refresh with the same cookie fails', async () => {
      await sharedAgent.post('/api/v1/auth/logout').set(sharedCsrfHeader).expect(204);

      // Same agent, same cookie jar: the refresh_token cookie it still holds
      // was already revoked server-side (deleted from Redis) by the logout.
      await sharedAgent.post('/api/v1/auth/refresh').expect(401);
    });
  });

  describe('forgot-password / reset-password flow', () => {
    it('enqueues a reset e-mail, and the embedded token can be used to set a new password', async () => {
      const enqueueSpy = jest.spyOn(app.get(MailerService), 'enqueue');

      // Public + @SkipCsrf(): no authenticated agent needed.
      await request(app.getHttpServer())
        .post('/api/v1/auth/forgot-password')
        .send({ email: ADMIN_EMAIL })
        .expect(204);

      expect(enqueueSpy).toHaveBeenCalledTimes(1);

      const job = enqueueSpy.mock.calls[0][0];
      const resetUrl = job.context.resetUrl as string;
      const token = new URL(resetUrl).searchParams.get('token');

      expect(token).toBeTruthy();

      enqueueSpy.mockRestore();

      const newPassword = 'NewAdminPass@456';

      await request(app.getHttpServer())
        .post('/api/v1/auth/reset-password')
        .send({ token, newPassword, confirmNewPassword: newPassword })
        .expect(204);

      // New password now works (4th of the 5 /auth/login calls in this file).
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ identifier: ADMIN_EMAIL, password: newPassword })
        .expect(200);

      // Old password no longer works (5th and last /auth/login call in this file).
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ identifier: ADMIN_EMAIL, password: ADMIN_PASSWORD })
        .expect(401);

      // This is the last test in the file: leaving the admin password
      // changed to `newPassword` is fine, nothing else depends on it.
    });
  });
});
