import { createHash } from 'crypto';

import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import Redis from 'ioredis';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';

import { IAuthUser } from '../../interfaces/auth-user.interface';
import { getRefreshTokenRedisKey } from '../../utils/redis-keys.util';
import { LoginUseCase } from '../login.use-case';

describe('LoginUseCase', () => {
  let useCase: LoginUseCase;
  let jwtService: DeepMockProxy<JwtService>;
  let config: DeepMockProxy<ConfigService>;
  let redis: DeepMockProxy<Redis>;

  const user: IAuthUser = {
    id: 1,
    uuid: 'user-uuid',
    email: 'user@example.com',
    name: 'Jane Doe',
    institutionalLink: null,
    status: 'ACTIVE',
    roles: [],
    permissions: ['users:read'],
  };

  const configDefaults: Record<string, string> = {
    'auth.jwtExpiresIn': '15m',
    'auth.jwtRefreshExpiresIn': '7d',
    'auth.jwtSecret': 'access-secret',
    'auth.jwtRefreshSecret': 'refresh-secret',
  };

  function stubConfig(overrides: Record<string, string | undefined> = {}): void {
    const values: Record<string, string | undefined> = { ...configDefaults, ...overrides };

    config.get.mockImplementation(
      // ConfigService.get<T>(key, defaultValue?) is overloaded; casting keeps the mock generic-free.
      (key: string, defaultValue?: unknown) => values[key] ?? defaultValue,
    );
  }

  beforeEach(() => {
    jwtService = mockDeep<JwtService>();
    config = mockDeep<ConfigService>();
    redis = mockDeep<Redis>();

    useCase = new LoginUseCase(jwtService, config, redis);

    stubConfig();

    jwtService.sign.mockImplementation((_payload, options) =>
      options &&
      typeof options === 'object' &&
      'secret' in options &&
      options.secret === 'refresh-secret'
        ? 'signed-refresh-token'
        : 'signed-access-token',
    );
  });

  it('signs the access and refresh tokens with their own secret and expiry', async () => {
    await useCase.execute(user);

    expect(jwtService.sign).toHaveBeenCalledWith(
      { sub: user.uuid, email: user.email },
      { secret: 'access-secret', expiresIn: 900 },
    );
    expect(jwtService.sign).toHaveBeenCalledWith(
      { sub: user.uuid },
      { secret: 'refresh-secret', expiresIn: 604800 },
    );
  });

  it('stores the sha256 hash of the refresh token in redis under the user key with the refresh TTL', async () => {
    await useCase.execute(user);

    const expectedHash = createHash('sha256').update('signed-refresh-token').digest('hex');

    expect(redis.set).toHaveBeenCalledWith(
      getRefreshTokenRedisKey(user.uuid),
      expectedHash,
      'EX',
      604800,
    );
  });

  it('returns the tokens, expirations, and public user projection', async () => {
    const result = await useCase.execute(user);

    expect(result).toEqual({
      accessToken: 'signed-access-token',
      refreshToken: 'signed-refresh-token',
      accessExpiresInSeconds: 900,
      refreshExpiresInSeconds: 604800,
      user: {
        uuid: user.uuid,
        email: user.email,
        name: user.name,
        institutionalLink: user.institutionalLink,
        status: user.status,
        roles: user.roles,
        permissions: user.permissions,
      },
    });
  });

  it('falls back to the default expirations when config values are missing', async () => {
    stubConfig({ 'auth.jwtExpiresIn': undefined, 'auth.jwtRefreshExpiresIn': undefined });

    const result = await useCase.execute(user);

    expect(result.accessExpiresInSeconds).toBe(900);
    expect(result.refreshExpiresInSeconds).toBe(604800);
  });
});
