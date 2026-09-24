import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { mockDeep } from 'jest-mock-extended';

import { AppException } from '../../exceptions';
import { CsrfGuard, XSRF_COOKIE_NAME, XSRF_HEADER_NAME } from '../csrf.guard';

function createContext(request: Partial<Request>): ExecutionContext {
  const getRequest = jest.fn().mockReturnValue(request);
  const switchToHttp = jest.fn().mockReturnValue({ getRequest });
  return {
    switchToHttp,
    getHandler: jest.fn(),
    getClass: jest.fn(),
  } as unknown as ExecutionContext;
}

describe('CsrfGuard', () => {
  let reflector: ReturnType<typeof mockDeep<Reflector>>;
  let guard: CsrfGuard;

  beforeEach(() => {
    reflector = mockDeep<Reflector>();
    guard = new CsrfGuard(reflector);
  });

  it('allows non-mutating methods without checking tokens', () => {
    reflector.getAllAndOverride.mockReturnValue(false);

    const result = guard.canActivate(createContext({ method: 'GET' }));

    expect(result).toBe(true);
  });

  it('allows the request when @SkipCsrf() metadata is present', () => {
    reflector.getAllAndOverride.mockReturnValue(true);

    const result = guard.canActivate(createContext({ method: 'POST', cookies: {}, headers: {} }));

    expect(result).toBe(true);
  });

  it('throws when the cookie token is missing', () => {
    reflector.getAllAndOverride.mockReturnValue(false);

    const context = createContext({
      method: 'POST',
      cookies: {},
      headers: { [XSRF_HEADER_NAME]: 'token' },
    });

    expect(() => guard.canActivate(context)).toThrow(AppException);
  });

  it('throws when the header token is missing', () => {
    reflector.getAllAndOverride.mockReturnValue(false);

    const context = createContext({
      method: 'POST',
      cookies: { [XSRF_COOKIE_NAME]: 'token' },
      headers: {},
    });

    expect(() => guard.canActivate(context)).toThrow(AppException);
  });

  it('throws when the cookie and header tokens diverge', () => {
    reflector.getAllAndOverride.mockReturnValue(false);

    const context = createContext({
      method: 'PUT',
      cookies: { [XSRF_COOKIE_NAME]: 'token-a' },
      headers: { [XSRF_HEADER_NAME]: 'token-b' },
    });

    expect(() => guard.canActivate(context)).toThrow(AppException);
  });

  it('allows the request when the cookie and header tokens match', () => {
    reflector.getAllAndOverride.mockReturnValue(false);

    const context = createContext({
      method: 'DELETE',
      cookies: { [XSRF_COOKIE_NAME]: 'same-token' },
      headers: { [XSRF_HEADER_NAME]: 'same-token' },
    });

    expect(guard.canActivate(context)).toBe(true);
  });
});
