import { CallHandler, ExecutionContext } from '@nestjs/common';
import { firstValueFrom, of } from 'rxjs';

import { RequestContextInterceptor } from '../request-context.interceptor';
import { RequestContextService } from '../request-context.service';

function createContext(request: Record<string, unknown>): ExecutionContext {
  const getRequest = jest.fn().mockReturnValue(request);
  const switchToHttp = jest.fn().mockReturnValue({ getRequest });
  return { switchToHttp } as unknown as ExecutionContext;
}

describe('RequestContextInterceptor', () => {
  let service: RequestContextService;
  let interceptor: RequestContextInterceptor;

  beforeEach(() => {
    service = new RequestContextService();
    interceptor = new RequestContextInterceptor(service);
  });

  it('populates the store with the request user uuid before invoking next.handle()', async () => {
    let capturedActorUuid: string | null = null;
    const next: CallHandler = {
      handle: () => {
        capturedActorUuid = service.getActorUuid();
        return of('result');
      },
    };

    const result = await firstValueFrom(
      interceptor.intercept(createContext({ user: { uuid: 'actor-uuid' } }), next),
    );

    expect(capturedActorUuid).toBe('actor-uuid');
    expect(result).toBe('result');
  });

  it('populates the store with null when the request has no user', () => {
    let capturedActorUuid: string | null = null;
    const next: CallHandler = {
      handle: () => {
        capturedActorUuid = service.getActorUuid();
        return of('result');
      },
    };

    interceptor.intercept(createContext({}), next);

    expect(capturedActorUuid).toBeNull();
  });

  it('leaves the store empty again after the call completes', () => {
    const next: CallHandler = { handle: () => of('result') };

    interceptor.intercept(createContext({ user: { uuid: 'actor-uuid' } }), next);

    expect(service.getActorUuid()).toBeNull();
  });
});
