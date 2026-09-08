import { INestApplication, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { DataSource } from 'typeorm';

import { MailProcessor } from '@core/mail/mail.processor';
import { MailerService } from '@core/mail/mailer.service';

import { startContainers, stopContainers, ITestContainers } from '../../support/containers';
import { bootstrapTestApp } from '../../support/test-app.helper';
import { createTestDataSource } from '../../support/test-data-source';

interface IMailhogHeaders {
  Subject?: string[];
  To?: string[];
}

interface IMailhogMessage {
  Content: {
    Headers: IMailhogHeaders;
    Body: string;
  };
}

interface IMailhogListResponse {
  items: IMailhogMessage[];
}

// nodemailer defaults html-only messages to quoted-printable: long lines get
// soft-wrapped ("=\r\n"), which can split a word (e.g. "Reset =\r\nPassword")
// right in the middle. Decode before asserting on rendered content.
function decodeQuotedPrintable(text: string): string {
  return text
    .replace(/=\r\n/g, '')
    .replace(/=\n/g, '')
    .replace(/=([0-9A-F]{2})/gi, (_match, hex: string) => String.fromCharCode(parseInt(hex, 16)));
}

async function waitForMailhogMessage(
  apiBaseUrl: string,
  predicate: (message: IMailhogMessage) => boolean,
  timeoutMs = 10000,
): Promise<IMailhogMessage> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const response = await fetch(`${apiBaseUrl}/api/v2/messages`);
    const body = (await response.json()) as IMailhogListResponse;
    const match = body.items.find(predicate);

    if (match) {
      return match;
    }

    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  throw new Error('Timed out waiting for MailHog to receive the message');
}

describe('mail processor (integration)', () => {
  let containers: ITestContainers;
  let dataSource: DataSource;
  let app: INestApplication;
  let mailerService: MailerService;
  let mailhogApiBaseUrl: string;

  beforeAll(async () => {
    containers = await startContainers({ mailhog: true });
    dataSource = await createTestDataSource(containers.postgres);

    // Read lazily by mail.config.ts (registerAs), so these must be set
    // before bootstrapTestApp() triggers the ConfigModule to read them.
    process.env.MAIL_HOST = containers.mailhog!.getHost();
    process.env.MAIL_PORT = String(containers.mailhog!.getMappedPort(1025));
    process.env.MAIL_SECURE = 'false';
    process.env.MAIL_USER = '';
    process.env.MAIL_PASSWORD = '';

    app = await bootstrapTestApp({
      dbHost: containers.postgres.getHost(),
      dbPort: containers.postgres.getPort(),
      dbUsername: containers.postgres.getUsername(),
      dbPassword: containers.postgres.getPassword(),
      dbName: containers.postgres.getDatabase(),
      redisHost: containers.redis.getHost(),
      redisPort: containers.redis.getPort(),
    });

    mailerService = app.get(MailerService);
    mailhogApiBaseUrl = `http://${containers.mailhog!.getHost()}:${containers.mailhog!.getMappedPort(8025)}`;
  }, 60000);

  afterAll(async () => {
    await app.close();
    await dataSource.destroy();
    await stopContainers(containers);
  });

  it('delivers a queued mail end-to-end through the real queue, worker and SMTP server', async () => {
    const to = 'someone@example.com';
    const subject = 'Test Subject';

    await mailerService.enqueue({
      to,
      subject,
      template: 'password-reset',
      context: {
        appName: 'Boilerplate',
        locale: 'pt-BR',
        greeting: 'Hello integration test',
        body: 'Body copy',
        resetUrl: 'http://example.com/reset/abc123',
        buttonLabel: 'Reset Password Now',
        linkFallback: 'link fallback text',
        footer: 'footer text',
        disclaimer: 'disclaimer text',
      },
    });

    const message = await waitForMailhogMessage(
      mailhogApiBaseUrl,
      (item) =>
        item.Content.Headers.To?.includes(to) === true &&
        item.Content.Headers.Subject?.includes(subject) === true,
    );

    const html = decodeQuotedPrintable(message.Content.Body);

    expect(html).toContain('Hello integration test');
    expect(html).toContain('Reset Password Now');
    expect(html).toContain('http://example.com/reset/abc123');
  }, 20000);

  it('retries with exponential backoff and gives up after exhausting all attempts, without failing the test', async () => {
    // Deterministic, container-free failure: MailTemplateService.render()
    // throws synchronously (ENOENT) because the template file doesn't
    // exist. This exercises the same retry path a real infra outage would
    // (attemptsMade climbing across the queue's configured
    // attempts: 3 / exponential backoff from mail.module.ts) without the
    // flakiness of actually stopping the Redis container mid-test.
    const processor = app.get(MailProcessor);
    const errorSpy = jest.spyOn(Logger.prototype, 'error');

    const failures: number[] = [];

    const onFailed = (job: Job | undefined): void => {
      if (job) {
        failures.push(job.attemptsMade);
      }
    };

    processor.worker.on('failed', onFailed);

    try {
      await mailerService.enqueue({
        to: 'nobody@example.com',
        subject: 'Should never be delivered',
        template: 'this-template-does-not-exist',
        context: {},
      });

      await new Promise<void>((resolve, reject) => {
        const deadline = Date.now() + 30000;

        const interval = setInterval(() => {
          if (failures.length > 0 && failures[failures.length - 1] === 3) {
            clearInterval(interval);
            resolve();
            return;
          }

          if (Date.now() > deadline) {
            clearInterval(interval);
            reject(new Error('Timed out waiting for the job to exhaust all attempts'));
          }
        }, 200);
      });
    } finally {
      processor.worker.off('failed', onFailed);
    }

    // All 3 configured attempts ran, each one failing (never a partial
    // success), and the queue gave up on attempt 3.
    expect(failures).toEqual([1, 2, 3]);

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        'Failed to send "this-template-does-not-exist" mail to nobody@example.com after 3 attempt(s)',
      ),
      expect.anything(),
    );

    errorSpy.mockRestore();
  }, 40000);
});
