# Background jobs (BullMQ)

Queues run on top of the Redis that already exists (`core/redis/`), via `@nestjs/bullmq`. Today
there's only one queue, the mail queue (see [mailing.md](./mailing.md)). This document describes
the pattern for registering a new one.

## Connection

`BullModule.forRootAsync` is registered once in `AppModule`, reusing the same environment
variables `RedisModule` already uses (`REDIS_HOST`/`REDIS_PORT`/`REDIS_PASSWORD`/`REDIS_DB`); same
infrastructure, same logical connection, no new env var per queue:

```ts
BullModule.forRootAsync({
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    connection: {
      host: config.get<string>('REDIS_HOST', 'localhost'),
      port: config.get<number>('REDIS_PORT', 6379),
      password: config.get<string>('REDIS_PASSWORD') || undefined,
      db: config.get<number>('REDIS_DB', 0),
    },
  }),
}),
```

## Registering a new queue

Inside the module that owns the queue (e.g. `core/mail/mail.module.ts`), register the queue with
its `defaultJobOptions`:

```ts
BullModule.registerQueue({
  name: MY_QUEUE_NAME,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: true,
    removeOnFail: 100, // keeps the last 100 failures around for manual inspection via Redis/CLI
  },
}),
```

`defaultJobOptions` lives on the queue, not on each `.add()` call: every job inherits the same
retry policy without repeating the configuration on every `enqueue()`.

## Producing a job

A thin service injects the queue via `@InjectQueue(MY_QUEUE_NAME)` and just calls `.add(...)`, with
no business logic:

```ts
@Injectable()
export class MailerService {
  constructor(@InjectQueue(MAIL_QUEUE_NAME) private readonly queue: Queue<IMailJob>) {}

  async enqueue(job: IMailJob): Promise<void> {
    await this.queue.add('send', job);
  }
}
```

## Consuming a job

A processor extends `WorkerHost` (the current version of `@nestjs/bullmq` no longer has a
`@Process()` method decorator; the processing method is the implementation of the abstract
`process` method) and is decorated with `@Processor(MY_QUEUE_NAME)`:

```ts
@Processor(MAIL_QUEUE_NAME)
export class MailProcessor extends WorkerHost {
  private readonly logger = new Logger(MailProcessor.name);

  constructor(/* ... */) {
    super();
  }

  async process(job: Job<IMailJob>): Promise<void> {
    // ... actual work ...
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<IMailJob>, error: Error): void {
    this.logger.error(`Failed job ${job.id}`, error.stack);
  }
}
```

## Error convention

No external alerting (out of scope). A failure after all `attempts` are exhausted is just logged
via `Logger` (project convention, see [conventions.md](./conventions.md#logging)) in the
`@OnWorkerEvent('failed')` handler, with the relevant `job.data` for manual diagnosis. The HTTP
endpoint that enqueued the job has already responded by that point (enqueuing is the last step of
the use-case, after any synchronous side effect that's actually required). An async processing
failure should never break the original HTTP response.
