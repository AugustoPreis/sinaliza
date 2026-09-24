import { HttpStatus } from '@nestjs/common';

import { AppException } from '@shared/exceptions';

import { ParseUuidPipe } from '../parse-uuid.pipe';

describe('ParseUuidPipe', () => {
  const pipe = new ParseUuidPipe();

  it('returns the value unchanged when it is a valid uuid', () => {
    const uuid = '123e4567-e89b-12d3-a456-426614174000';

    expect(pipe.transform(uuid)).toBe(uuid);
  });

  it('throws a 400 AppException for an invalid uuid', () => {
    expect(() => pipe.transform('not-a-uuid')).toThrow(AppException);

    try {
      pipe.transform('not-a-uuid');
      fail('expected transform to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(AppException);
      expect((error as AppException).i18nKey).toBe('errors.invalidUuid');
      expect((error as AppException).getStatus()).toBe(HttpStatus.BAD_REQUEST);
      expect((error as AppException).args).toEqual({ value: 'not-a-uuid' });
    }
  });
});
