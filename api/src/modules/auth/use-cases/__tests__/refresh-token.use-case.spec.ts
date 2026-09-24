import { createHash } from 'crypto';

import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import Redis from 'ioredis';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';

import { AppException } from '@shared/exceptions';

import { UserEntity } from '../../../users/entities/user.entity';
import { EUserStatus } from '../../../users/enums/user-status.enum';
import { UsersRepository } from '../../../users/repositories/users.repository';
import { ILoginResult } from '../../interfaces/login-result.interface';
import { getRefreshTokenRedisKey } from '../../utils/redis-keys.util';
import { LoginUseCase } from '../login.use-case';
import { RefreshTokenUseCase } from '../refresh-token.use-case';

describe('RefreshTokenUseCase', () => {
  let useCase: RefreshTokenUseCase;
  let jwtService: DeepMockProxy<JwtService>;
  let config: DeepMockProxy<ConfigService>;
  let usersRepository: DeepMockProxy<UsersRepository>;
  let loginUseCase: DeepMockProxy<LoginUseCase>;
  let redis: DeepMockProxy<Redis>;

  const REFRESH_TOKEN = 'incoming-refresh-token';
  const REFRESH_TOKEN_HASH = createHash('sha256').update(REFRESH_TOKEN).digest('hex');
  const USER_UUID = 'user-uuid';

  const activeUser = {
    id: 1,
    uuid: USER_UUID,
    email: 'user@example.com',
    name: 'Jane Doe',
    institutionalLink: null,
    status: EUserStatus.ACTIVE,
    userRoles: [],
  } as unknown as UserEntity;

  const loginResult = { accessToken: 'new-access-token' } as unknown as ILoginResult;

  beforeEach(() => {
    jwtService = mockDeep<JwtService>();
    config = mockDeep<ConfigService>();
    usersRepository = mockDeep<UsersRepository>();
    loginUseCase = mockDeep<LoginUseCase>();
    redis = mockDeep<Redis>();

    useCase = new RefreshTokenUseCase(jwtService, config, usersRepository, loginUseCase, redis);

    config.get.mockReturnValue('refresh-secret');
    jwtService.verify.mockReturnValue({ sub: USER_UUID });
    redis.get.mockResolvedValue(REFRESH_TOKEN_HASH);
    usersRepository.findByUuid.mockResolvedValue(activeUser);
    loginUseCase.execute.mockResolvedValue(loginResult);
  });

  it('rejects an empty refresh token before touching redis or the repository', async () => {
    await expect(useCase.execute('')).rejects.toMatchObject({
      i18nKey: 'auth.errors.refreshTokenNotFound',
      status: 401,
    });
    expect(redis.get).not.toHaveBeenCalled();
    expect(usersRepository.findByUuid).not.toHaveBeenCalled();
  });

  it('rejects a token that fails jwt verification (expired or malformed)', async () => {
    jwtService.verify.mockImplementation(() => {
      throw new Error('jwt expired');
    });

    await expect(useCase.execute(REFRESH_TOKEN)).rejects.toMatchObject({
      i18nKey: 'auth.errors.refreshTokenInvalid',
      status: 401,
    });
  });

  it('verifies the token against the refresh secret', async () => {
    await useCase.execute(REFRESH_TOKEN);

    expect(jwtService.verify).toHaveBeenCalledWith(REFRESH_TOKEN, { secret: 'refresh-secret' });
  });

  it('rejects when no hash is stored for the user (already logged out / never logged in)', async () => {
    redis.get.mockResolvedValue(null);

    await expect(useCase.execute(REFRESH_TOKEN)).rejects.toMatchObject({
      i18nKey: 'auth.errors.refreshTokenNotFound',
      status: 401,
    });
    expect(redis.get).toHaveBeenCalledWith(getRefreshTokenRedisKey(USER_UUID));
  });

  it('rejects when the stored hash does not match the incoming token (revoked/rotated session)', async () => {
    redis.get.mockResolvedValue('a-different-hash');

    await expect(useCase.execute(REFRESH_TOKEN)).rejects.toMatchObject({
      i18nKey: 'auth.errors.refreshTokenInvalid',
      status: 401,
    });
  });

  it('rejects when the user no longer exists', async () => {
    usersRepository.findByUuid.mockResolvedValue(null);

    await expect(useCase.execute(REFRESH_TOKEN)).rejects.toMatchObject({
      i18nKey: 'auth.errors.invalidCredentials',
      status: 401,
    });
  });

  it('rejects when the user has been deactivated since the token was issued', async () => {
    usersRepository.findByUuid.mockResolvedValue({
      ...activeUser,
      status: EUserStatus.INACTIVE,
    });

    await expect(useCase.execute(REFRESH_TOKEN)).rejects.toBeInstanceOf(AppException);
    await expect(useCase.execute(REFRESH_TOKEN)).rejects.toMatchObject({
      i18nKey: 'auth.errors.invalidCredentials',
      status: 401,
    });
  });

  it('issues a new session by delegating to LoginUseCase with the mapped auth user', async () => {
    const result = await useCase.execute(REFRESH_TOKEN);

    expect(loginUseCase.execute).toHaveBeenCalledWith({
      id: activeUser.id,
      uuid: activeUser.uuid,
      email: activeUser.email,
      name: activeUser.name,
      institutionalLink: activeUser.institutionalLink,
      status: activeUser.status,
      roles: [],
      permissions: [],
    });
    expect(result).toBe(loginResult);
  });
});
