import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { JWT_STRATEGY } from '@shared/constants';

import { IJwtPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, JWT_STRATEGY) {
  constructor(config: ConfigService) {
    super({
      // access token never comes via Authorization header, always httpOnly.
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request): string | null => req?.cookies?.access_token ?? null,
      ]),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('auth.jwtSecret') ?? '',
    });
  }

  validate(payload: IJwtPayload): IJwtPayload & { uuid: string } {
    return { ...payload, uuid: payload.sub };
  }
}
