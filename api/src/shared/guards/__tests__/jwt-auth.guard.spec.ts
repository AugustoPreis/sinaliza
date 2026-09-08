import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { mockDeep } from 'jest-mock-extended';

import { JWT_STRATEGY } from '../../constants';
import { AppException } from '../../exceptions';
import { JwtAuthGuard } from '../jwt-auth.guard';

describe('JwtAuthGuard', () => {
  let reflector: ReturnType<typeof mockDeep<Reflector>>;
  let guard: JwtAuthGuard;
  let superCanActivate: jest.SpyInstance;

  beforeEach(() => {
    reflector = mockDeep<Reflector>();
    guard = new JwtAuthGuard(reflector);
    superCanActivate = jest
      .spyOn(AuthGuard(JWT_STRATEGY).prototype, 'canActivate')
      .mockReturnValue(true);
  });

  afterEach(() => {
    superCanActivate.mockRestore();
  });

  it('bypasses passport when the route is @Public()', () => {
    reflector.getAllAndOverride.mockReturnValue(true);

    const result = guard.canActivate(mockDeep<ExecutionContext>());

    expect(result).toBe(true);
    expect(superCanActivate).not.toHaveBeenCalled();
  });

  it('delegates to the passport AuthGuard when the route is not public', () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const context = mockDeep<ExecutionContext>();

    const result = guard.canActivate(context);

    expect(result).toBe(true);
    expect(superCanActivate).toHaveBeenCalledWith(context);
  });

  describe('handleRequest', () => {
    it('returns the user when there is no error', () => {
      const user = { uuid: 'actor-uuid' };

      expect(guard.handleRequest(null, user)).toBe(user);
    });

    it('rethrows the passport error when one is present', () => {
      const error = new Error('boom');

      expect(() => guard.handleRequest(error, null)).toThrow(error);
    });

    it('throws an unauthorized AppException when there is no error and no user', () => {
      expect(() => guard.handleRequest(null, null)).toThrow(AppException);
      try {
        guard.handleRequest(null, null);
        fail('expected handleRequest to throw');
      } catch (error) {
        expect(error).toBeInstanceOf(AppException);
        expect((error as AppException).i18nKey).toBe('errors.unauthorized');
      }
    });
  });
});
