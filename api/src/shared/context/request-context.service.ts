import { AsyncLocalStorage } from 'node:async_hooks';

import { Injectable } from '@nestjs/common';

import { IRequestContextStore } from './request-context.interface';

/**
 * Thin wrapper around Node's native `AsyncLocalStorage`, giving any component
 * that runs outside of Nest's own request scope (e.g. the `AuditSubscriber`,
 * driven by TypeORM rather than by an incoming HTTP request) a way to read
 * request-scoped data such as the current actor.
 *
 * Populated by `RequestContextInterceptor` on every request; safe to call
 * from anywhere else (seeds, scripts, background jobs) since `getActorUuid()`
 * simply returns `null` when called outside of an active `run()`.
 */
@Injectable()
export class RequestContextService {
  private readonly storage = new AsyncLocalStorage<IRequestContextStore>();

  run<T>(store: IRequestContextStore, callback: () => T): T {
    return this.storage.run(store, callback);
  }

  getActorUuid(): string | null {
    return this.storage.getStore()?.actorUuid ?? null;
  }
}
