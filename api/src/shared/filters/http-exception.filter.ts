import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';
import { Request, Response } from 'express';
import { I18nContext, I18nValidationException } from 'nestjs-i18n';

import { flattenValidationMessages } from '@shared/pipes';

import { AppException } from '../exceptions/app.exception';

/**
 * Catches every `HttpException`, including `I18nValidationException` (thrown
 * by `i18nFieldValidationExceptionFactory`). It's handled here directly rather
 * than via a second `@Catch(I18nValidationException)` filter, since NestJS
 * reverses global filters before matching (last registered is tried first),
 * so a second filter would silently lose to this one whenever it's
 * registered before it. One filter, one envelope, no ordering to get wrong.
 */
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost): void {
    const status = exception.getStatus();
    const ctx = host.switchToHttp();

    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const i18n = I18nContext.current(host);

    let message: string | string[];
    let code: string | undefined;

    if (exception instanceof I18nValidationException) {
      message = flattenValidationMessages(exception.errors);
    } else if (exception instanceof AppException) {
      code = exception.code;
      message = i18n
        ? i18n.translate(exception.i18nKey, { args: exception.args })
        : exception.i18nKey;
    } else {
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else {
        const body = exceptionResponse as Record<string, unknown>;

        code = body.code as string | undefined;
        message =
          typeof body.message === 'string' || Array.isArray(body.message)
            ? (body.message as string | string[])
            : exception.message;
      }
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
      code: code ?? undefined,
    });
  }
}
