import { createHash } from 'crypto';

import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import Redis from 'ioredis';

import { REDIS_CLIENT } from '@core/redis/redis.constants';

import { TimeUnitHelper } from '@shared/helpers';

import { IAuthUser } from '../interfaces/auth-user.interface';
import { IJwtPayload } from '../interfaces/jwt-payload.interface';
import { ILoginResult } from '../interfaces/login-result.interface';
import { getRefreshTokenRedisKey } from '../utils/redis-keys.util';

@Injectable()
export class LoginUseCase {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async execute(user: IAuthUser): Promise<ILoginResult> {
    const payload: IJwtPayload = { sub: user.uuid, email: user.email };

    const accessExpiresInSeconds = TimeUnitHelper.durationToSeconds(
      this.config.get<string>('auth.jwtExpiresIn', '15m'),
    );
    const refreshExpiresInSeconds = TimeUnitHelper.durationToSeconds(
      this.config.get<string>('auth.jwtRefreshExpiresIn', '7d'),
    );

    const accessToken = this.jwtService.sign(payload, {
      secret: this.config.get<string>('auth.jwtSecret'),
      expiresIn: accessExpiresInSeconds,
    });

    const refreshToken = this.jwtService.sign(
      { sub: user.uuid },
      {
        secret: this.config.get<string>('auth.jwtRefreshSecret'),
        expiresIn: refreshExpiresInSeconds,
      },
    );

    const hash = createHash('sha256').update(refreshToken).digest('hex');

    await this.redis.set(getRefreshTokenRedisKey(user.uuid), hash, 'EX', refreshExpiresInSeconds);

    return {
      accessToken,
      refreshToken,
      accessExpiresInSeconds,
      refreshExpiresInSeconds,
      user: {
        uuid: user.uuid,
        email: user.email,
        name: user.name,
        institutionalLink: user.institutionalLink,
        status: user.status,
        roles: user.roles,
        permissions: user.permissions,
      },
    };
  }
}
