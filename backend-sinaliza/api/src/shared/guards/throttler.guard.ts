import { HttpStatus, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

import { AppException } from '../exceptions';

@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  protected override throwThrottlingException(): Promise<void> {
    throw AppException.from('errors.tooManyRequests', HttpStatus.TOO_MANY_REQUESTS);
  }
}
