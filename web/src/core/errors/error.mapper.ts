import type { AxiosError } from 'axios';

import { AppError } from './app.error';
import type { IApiErrorResponse } from './error.types';

export function mapAxiosErrorToAppError(error: AxiosError<IApiErrorResponse>): AppError {
  const response = error.response?.data;

  if (response) {
    const message = Array.isArray(response.message) ? response.message.join(' ') : response.message;

    return new AppError(message, response.statusCode, response.code);
  }

  return new AppError(error.message, 0);
}
