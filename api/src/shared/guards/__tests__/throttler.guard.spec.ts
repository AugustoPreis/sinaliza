import { HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ThrottlerModuleOptions, ThrottlerStorage } from '@nestjs/throttler';
import { mockDeep } from 'jest-mock-extended';

import { AppException } from '../../exceptions';
import { AppThrottlerGuard } from '../throttler.guard';

/**
 * `AppThrottlerGuard` only overrides `throwThrottlingException` to translate
 * NestJS's default `ThrottlerException` into an `AppException`; it adds no
 * tracker/skip logic of its own, so this is the only behavior worth covering
 * here (the rest is `@nestjs/throttler`'s own, already-tested guard logic).
 */
describe('AppThrottlerGuard', () => {
  it('throws a 429 AppException instead of the default ThrottlerException', () => {
    const options: ThrottlerModuleOptions = [];
    const storageService = mockDeep<ThrottlerStorage>();
    const reflector = mockDeep<Reflector>();
    const guard = new AppThrottlerGuard(options, storageService, reflector);
    const call = (): Promise<void> =>
      (
        guard as unknown as { throwThrottlingException(): Promise<void> }
      ).throwThrottlingException();

    expect(call).toThrow(AppException);
    expect(call).toThrow(
      expect.objectContaining({
        i18nKey: 'errors.tooManyRequests',
        status: HttpStatus.TOO_MANY_REQUESTS,
      }),
    );
  });
});
