import type { ErrorCode } from '@shared/types/error-code.type';

import type { IAppError } from './error.types';

export class AppError extends Error implements IAppError {
  public readonly statusCode: number;
  public readonly code?: ErrorCode;

  constructor(message: string, statusCode: number, code?: ErrorCode) {
    super(message);

    this.name = 'AppError';
    this.statusCode = statusCode;

    if (code) {
      this.code = code;
    }
  }
}
