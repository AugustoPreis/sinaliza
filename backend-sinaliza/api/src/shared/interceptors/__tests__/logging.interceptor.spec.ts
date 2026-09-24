import { CallHandler, ExecutionContext, Logger } from '@nestjs/common';
import { firstValueFrom, of, throwError } from 'rxjs';

import { LoggingInterceptor } from '../logging.interceptor';

function createContext(request: Record<string, unknown>): ExecutionContext {
  const getRequest = jest.fn().mockReturnValue(request);
  const switchToHttp = jest.fn().mockReturnValue({ getRequest });
  return { switchToHttp } as unknown as ExecutionContext;
}

describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    interceptor = new LoggingInterceptor();
    logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it('logs the method, url and elapsed time after the handler emits', async () => {
    const next: CallHandler = { handle: () => of('result') };

    const result = await firstValueFrom(
      interceptor.intercept(createContext({ method: 'GET', url: '/users' }), next),
    );

    expect(result).toBe('result');
    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledWith(expect.stringMatching(/^GET \/users \(\d+ms\)$/));
  });

  it('does not log when the handler errors', async () => {
    const next: CallHandler = { handle: () => throwError(() => new Error('boom')) };

    await expect(
      firstValueFrom(interceptor.intercept(createContext({ method: 'POST', url: '/users' }), next)),
    ).rejects.toThrow('boom');
    expect(logSpy).not.toHaveBeenCalled();
  });
});
