import { HttpStatus, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { LOCAL_STRATEGY } from '@shared/constants';
import { AppException } from '@shared/exceptions';

@Injectable()
export class LocalAuthGuard extends AuthGuard(LOCAL_STRATEGY) {
  override handleRequest<TUser>(err: unknown, user: TUser): TUser {
    if (err || !user) {
      throw (
        (err as Error) ||
        AppException.from('auth.errors.invalidCredentials', HttpStatus.UNAUTHORIZED)
      );
    }

    return user;
  }
}
