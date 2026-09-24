import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { ValidationError } from 'class-validator';
import { Request, Response } from 'express';
import { mockDeep } from 'jest-mock-extended';
import { I18nContext, I18nValidationException } from 'nestjs-i18n';

import { AppException } from '../../exceptions/app.exception';
import { HttpExceptionFilter } from '../http-exception.filter';

function createHost(request: Partial<Request>): { host: ArgumentsHost; response: Response } {
  const response = mockDeep<Response>();
  response.status.mockReturnValue(response);

  const getResponse = jest.fn().mockReturnValue(response);
  const getRequest = jest.fn().mockReturnValue(request);
  const switchToHttp = jest.fn().mockReturnValue({ getResponse, getRequest });
  const host = { switchToHttp } as unknown as ArgumentsHost;

  return { host, response };
}

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  let currentSpy: jest.SpyInstance;

  beforeEach(() => {
    filter = new HttpExceptionFilter();
    currentSpy = jest.spyOn(I18nContext, 'current');
  });

  afterEach(() => {
    currentSpy.mockRestore();
  });

  it('flattens I18nValidationException errors into a plain message list', () => {
    currentSpy.mockReturnValue(undefined);
    const errors = [
      {
        property: 'email',
        constraints: { isEmail: 'Email must be valid' },
        children: [],
      } as unknown as ValidationError,
    ];
    const exception = new I18nValidationException(errors);
    const { host, response } = createHost({ url: '/users' });

    filter.catch(exception, host);

    expect(response.status).toHaveBeenCalledWith(exception.getStatus());
    expect(response.json).toHaveBeenCalledWith({
      success: false,
      statusCode: exception.getStatus(),
      timestamp: expect.any(String),
      path: '/users',
      message: ['Email must be valid'],
      code: undefined,
    });
  });

  it('translates the AppException i18nKey when an I18nContext is active', () => {
    const translate = jest.fn().mockReturnValue('Recurso não encontrado');
    currentSpy.mockReturnValue({ translate });
    const exception = AppException.from('errors.notFound', HttpStatus.NOT_FOUND, {
      args: { id: '1' },
      code: 'NOT_FOUND',
    });
    const { host, response } = createHost({ url: '/users/1' });

    filter.catch(exception, host);

    expect(translate).toHaveBeenCalledWith('errors.notFound', { args: { id: '1' } });
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: HttpStatus.NOT_FOUND,
        path: '/users/1',
        message: 'Recurso não encontrado',
        code: 'NOT_FOUND',
      }),
    );
  });

  it('falls back to the raw i18nKey when there is no active I18nContext', () => {
    currentSpy.mockReturnValue(undefined);
    const exception = AppException.from('errors.forbidden', HttpStatus.FORBIDDEN);
    const { host, response } = createHost({ url: '/roles' });

    filter.catch(exception, host);

    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'errors.forbidden', code: undefined }),
    );
  });

  describe('generic HttpException', () => {
    beforeEach(() => currentSpy.mockReturnValue(undefined));

    it('uses the response string as the message', () => {
      const exception = new HttpException('Not allowed', HttpStatus.BAD_REQUEST);
      const { host, response } = createHost({ url: '/x' });

      filter.catch(exception, host);

      expect(response.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Not allowed',
          code: undefined,
        }),
      );
    });

    it('extracts message and code from an object response body', () => {
      const exception = new HttpException(
        { message: ['field is required'], code: 'VALIDATION_ERROR' },
        HttpStatus.BAD_REQUEST,
      );
      const { host, response } = createHost({ url: '/x' });

      filter.catch(exception, host);

      expect(response.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: ['field is required'],
          code: 'VALIDATION_ERROR',
        }),
      );
    });

    it('falls back to exception.message when the body has no usable message', () => {
      const exception = new HttpException({ foo: 'bar' }, HttpStatus.BAD_REQUEST);
      const { host, response } = createHost({ url: '/x' });

      filter.catch(exception, host);

      expect(response.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: exception.message, code: undefined }),
      );
    });
  });
});
