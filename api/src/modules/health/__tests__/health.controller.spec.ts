import Redis from 'ioredis';
import { mockDeep, MockProxy } from 'jest-mock-extended';
import { DataSource } from 'typeorm';

import { HealthController } from '../health.controller';

describe('HealthController', () => {
  let dataSource: MockProxy<DataSource>;
  let redis: MockProxy<Redis>;
  let controller: HealthController;

  beforeEach(() => {
    dataSource = mockDeep<DataSource>();
    redis = mockDeep<Redis>();
    controller = new HealthController(dataSource, redis);
  });

  it('reports ok when the database and redis both respond', async () => {
    dataSource.query.mockResolvedValue([{ '?column?': 1 }]);
    redis.ping.mockResolvedValue('PONG');

    const result = await controller.check();

    expect(dataSource.query).toHaveBeenCalledWith('SELECT 1');
    expect(redis.ping).toHaveBeenCalled();
    expect(result.status).toBe('ok');
    expect(result.checks).toEqual({ database: 'ok', redis: 'ok' });
    expect(typeof result.uptime).toBe('number');
    expect(() => new Date(result.timestamp).toISOString()).not.toThrow();
  });

  it('reports degraded with a database error when the database check fails', async () => {
    dataSource.query.mockRejectedValue(new Error('connection refused'));
    redis.ping.mockResolvedValue('PONG');

    const result = await controller.check();

    expect(result.status).toBe('degraded');
    expect(result.checks).toEqual({ database: 'error', redis: 'ok' });
  });

  it('reports degraded with a redis error when the redis check fails', async () => {
    dataSource.query.mockResolvedValue([{ '?column?': 1 }]);
    redis.ping.mockRejectedValue(new Error('redis unavailable'));

    const result = await controller.check();

    expect(result.status).toBe('degraded');
    expect(result.checks).toEqual({ database: 'ok', redis: 'error' });
  });
});
