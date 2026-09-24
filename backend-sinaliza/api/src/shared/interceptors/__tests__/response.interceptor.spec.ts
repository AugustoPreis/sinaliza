import { CallHandler, ExecutionContext, StreamableFile } from '@nestjs/common';
import { mockDeep } from 'jest-mock-extended';
import { firstValueFrom, of } from 'rxjs';

import { IApiResponse, ResponseInterceptor } from '../response.interceptor';

describe('ResponseInterceptor', () => {
  let interceptor: ResponseInterceptor<unknown>;

  beforeEach(() => {
    interceptor = new ResponseInterceptor();
  });

  it('wraps the handler payload in a success envelope with a timestamp', async () => {
    const next: CallHandler = { handle: () => of({ id: 'abc' }) };

    const result = (await firstValueFrom(
      interceptor.intercept(mockDeep<ExecutionContext>(), next),
    )) as IApiResponse<unknown>;

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ id: 'abc' });
    expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
  });

  it('wraps falsy payloads (e.g. null) the same way', async () => {
    const next: CallHandler = { handle: () => of(null) };

    const result = (await firstValueFrom(
      interceptor.intercept(mockDeep<ExecutionContext>(), next),
    )) as IApiResponse<unknown>;

    expect(result.success).toBe(true);
    expect(result.data).toBeNull();
  });

  it('passes StreamableFile responses through untouched', async () => {
    const file = new StreamableFile(Buffer.from('binary-content'));
    const next: CallHandler = { handle: () => of(file) };

    const result = await firstValueFrom(interceptor.intercept(mockDeep<ExecutionContext>(), next));

    expect(result).toBe(file);
  });
});
