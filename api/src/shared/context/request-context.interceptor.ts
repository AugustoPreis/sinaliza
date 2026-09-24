import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Request } from 'express';
import { Observable } from 'rxjs';

import { IRequestContextStore } from './request-context.interface';
import { RequestContextService } from './request-context.service';

/**
 * Populates `RequestContextService` with the current request's actor so
 * components that run outside of Nest's request scope, chiefly the
 * `AuditSubscriber`, driven by TypeORM rather than by HTTP, can still know
 * who triggered a change.
 *
 * `next.handle()` must be called synchronously inside `run()` (rather than,
 * say, inside a `.pipe(tap(...))` callback run later): Nest binds the rest of
 * the interceptor/handler chain to the async context active at the moment
 * `next.handle()` is invoked, so this is what makes the `AsyncLocalStorage`
 * store survive across the whole Observable/async chain instead of being
 * lost by the time the controller method actually runs.
 */
@Injectable()
export class RequestContextInterceptor implements NestInterceptor {
  constructor(private readonly requestContextService: RequestContextService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request & { user?: { uuid?: string } }>();

    const store: IRequestContextStore = {
      actorUuid: request.user?.uuid ?? null,
    };

    return this.requestContextService.run(store, () => next.handle());
  }
}
