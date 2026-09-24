import { Controller, Get, Inject } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { InjectDataSource } from '@nestjs/typeorm';
import Redis from 'ioredis';
import { DataSource } from 'typeorm';

import { REDIS_CLIENT } from '@core/redis/redis.constants';

import { Public } from '@shared/decorators/public.decorator';

interface IHealthCheckResult {
  status: 'ok' | 'degraded';
  timestamp: string;
  uptime: number;
  checks: Record<string, 'ok' | 'error'>;
}

@ApiTags('Health')
@SkipThrottle()
@Controller({ path: 'health', version: '1' })
export class HealthController {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Health check with dependency status' })
  async check(): Promise<IHealthCheckResult> {
    const checks: Record<string, 'ok' | 'error'> = {};

    try {
      await this.dataSource.query('SELECT 1');

      checks.database = 'ok';
    } catch {
      checks.database = 'error';
    }

    try {
      await this.redis.ping();

      checks.redis = 'ok';
    } catch {
      checks.redis = 'error';
    }

    const allOk = Object.values(checks).every((v) => v === 'ok');

    return {
      status: allOk ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks,
    };
  }
}
