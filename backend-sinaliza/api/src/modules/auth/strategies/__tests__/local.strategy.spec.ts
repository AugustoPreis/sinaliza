import { Request } from 'express';
import Redis, { ChainableCommander } from 'ioredis';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';

import { HashService } from '@shared/services/hash.service';

import { UserEntity } from '../../../users/entities/user.entity';
import { EUserStatus } from '../../../users/enums/user-status.enum';
import { UsersRepository } from '../../../users/repositories/users.repository';
import { LocalStrategy } from '../local.strategy';

function buildRequest(overrides: Partial<Request> = {}): Request {
  return {
    ip: '203.0.113.10',
    socket: { remoteAddress: '203.0.113.10' },
    ...overrides,
  } as unknown as Request;
}

describe('LocalStrategy', () => {
  let strategy: LocalStrategy;
  let usersRepository: DeepMockProxy<UsersRepository>;
  let hashService: DeepMockProxy<HashService>;
  let redis: DeepMockProxy<Redis>;
  let multi: DeepMockProxy<ChainableCommander>;

  const EMAIL = 'user@example.com';
  const PASSWORD = 'correct-password';
  const RATE_LIMIT_KEY = 'auth:login:attempts:203.0.113.10';

  const activeUserWithPassword = {
    id: 1,
    uuid: 'user-uuid',
    email: EMAIL,
    name: 'Jane Doe',
    institutionalLink: null,
    status: EUserStatus.ACTIVE,
    passwordHash: 'hashed-password',
    userRoles: [],
  } as unknown as UserEntity;

  beforeEach(() => {
    usersRepository = mockDeep<UsersRepository>();
    hashService = mockDeep<HashService>();
    redis = mockDeep<Redis>();
    multi = mockDeep<ChainableCommander>();

    strategy = new LocalStrategy(usersRepository, hashService, redis);

    multi.incr.mockReturnValue(multi);
    multi.expire.mockReturnValue(multi);
    multi.exec.mockResolvedValue([]);
    redis.multi.mockReturnValue(multi);

    redis.get.mockResolvedValue(null);
    usersRepository.findByIdentifierWithPassword.mockResolvedValue(activeUserWithPassword);
    hashService.compare.mockResolvedValue(true);
  });

  it('rejects immediately once the IP has reached the max attempts, without touching the repository', async () => {
    redis.get.mockResolvedValue(String(5));

    await expect(strategy.validate(buildRequest(), EMAIL, PASSWORD)).rejects.toMatchObject({
      i18nKey: 'auth.errors.tooManyAttempts',
      status: 429,
    });
    expect(usersRepository.findByIdentifierWithPassword).not.toHaveBeenCalled();
  });

  it('allows the attempt when the IP is below the max attempts', async () => {
    redis.get.mockResolvedValue(String(4));

    await expect(strategy.validate(buildRequest(), EMAIL, PASSWORD)).resolves.toBeDefined();
  });

  it('rejects and registers a failed attempt when no user exists for the e-mail', async () => {
    usersRepository.findByIdentifierWithPassword.mockResolvedValue(null);

    await expect(strategy.validate(buildRequest(), EMAIL, PASSWORD)).rejects.toMatchObject({
      i18nKey: 'auth.errors.invalidCredentials',
      status: 401,
    });
    expect(redis.multi).toHaveBeenCalled();
    expect(multi.incr).toHaveBeenCalledWith(RATE_LIMIT_KEY);
    expect(multi.expire).toHaveBeenCalledWith(RATE_LIMIT_KEY, 15 * 60);
  });

  it('rejects and registers a failed attempt when the password does not match', async () => {
    hashService.compare.mockResolvedValue(false);

    await expect(strategy.validate(buildRequest(), EMAIL, PASSWORD)).rejects.toMatchObject({
      i18nKey: 'auth.errors.invalidCredentials',
      status: 401,
    });
    expect(multi.incr).toHaveBeenCalledWith(RATE_LIMIT_KEY);
  });

  it('rejects a correct password for a user that is not ACTIVE, without leaking the reason', async () => {
    usersRepository.findByIdentifierWithPassword.mockResolvedValue({
      ...activeUserWithPassword,
      status: EUserStatus.INACTIVE,
    });

    await expect(strategy.validate(buildRequest(), EMAIL, PASSWORD)).rejects.toMatchObject({
      i18nKey: 'auth.errors.invalidCredentials',
      status: 401,
    });
    expect(multi.incr).toHaveBeenCalledWith(RATE_LIMIT_KEY);
  });

  it('clears the rate-limit counter and returns the mapped auth user on success', async () => {
    const result = await strategy.validate(buildRequest(), EMAIL, PASSWORD);

    expect(redis.del).toHaveBeenCalledWith(RATE_LIMIT_KEY);
    expect(result).toEqual({
      id: activeUserWithPassword.id,
      uuid: activeUserWithPassword.uuid,
      email: activeUserWithPassword.email,
      name: activeUserWithPassword.name,
      institutionalLink: activeUserWithPassword.institutionalLink,
      status: activeUserWithPassword.status,
      roles: [],
      permissions: [],
    });
  });

  it('looks up the user by lowercased e-mail', async () => {
    await strategy.validate(buildRequest(), 'User@Example.com', PASSWORD);

    expect(usersRepository.findByIdentifierWithPassword).toHaveBeenCalledWith(EMAIL);
  });

  it('strips the IPv6-mapped IPv4 prefix before building the rate-limit key', async () => {
    await strategy.validate(buildRequest({ ip: '::ffff:203.0.113.10' }), EMAIL, PASSWORD);

    expect(redis.get).toHaveBeenCalledWith(RATE_LIMIT_KEY);
  });

  it('falls back to the socket remote address when req.ip is unavailable', async () => {
    await strategy.validate(
      buildRequest({
        ip: undefined,
        socket: { remoteAddress: '198.51.100.7' },
      } as unknown as Partial<Request>),
      EMAIL,
      PASSWORD,
    );

    expect(redis.get).toHaveBeenCalledWith('auth:login:attempts:198.51.100.7');
  });

  it('falls back to "unknown" when neither req.ip nor the socket address are available', async () => {
    await strategy.validate(
      buildRequest({ ip: undefined, socket: {} } as unknown as Partial<Request>),
      EMAIL,
      PASSWORD,
    );

    expect(redis.get).toHaveBeenCalledWith('auth:login:attempts:unknown');
  });
});
