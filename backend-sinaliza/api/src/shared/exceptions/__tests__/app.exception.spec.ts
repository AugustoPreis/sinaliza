import { HttpStatus } from '@nestjs/common';

import { AppException } from '../app.exception';

describe('AppException', () => {
  it('sets i18nKey, status, args and code via .from()', () => {
    const exception = AppException.from('errors.notFound', HttpStatus.NOT_FOUND, {
      args: { id: 'abc' },
      code: 'NOT_FOUND',
    });

    expect(exception).toBeInstanceOf(AppException);
    expect(exception.i18nKey).toBe('errors.notFound');
    expect(exception.getStatus()).toBe(HttpStatus.NOT_FOUND);
    expect(exception.args).toEqual({ id: 'abc' });
    expect(exception.code).toBe('NOT_FOUND');
  });

  it('leaves args and code undefined when no options are given', () => {
    const exception = AppException.from('errors.forbidden', HttpStatus.FORBIDDEN);

    expect(exception.args).toBeUndefined();
    expect(exception.code).toBeUndefined();
    expect(exception.getResponse()).toEqual({ i18nKey: 'errors.forbidden', code: undefined });
  });
});
