import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';

import { REDIS_CLIENT } from '@core/redis/redis.constants';

import { getRefreshTokenRedisKey } from '../utils/redis-keys.util';

@Injectable()
export class LogoutUseCase {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async execute(userUuid: string): Promise<void> {
    await this.redis.del(getRefreshTokenRedisKey(userUuid));
  }
}
