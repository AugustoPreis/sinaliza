import { createHash } from 'crypto';

import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import Redis from 'ioredis';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';

import { HashService } from '@shared/services/hash.service';

import { UserEntity } from '../../../users/entities/user.entity';
import { UsersRepository } from '../../../users/repositories/users.repository';
import { ResetPasswordDTO } from '../../dtos/reset-password.dto';
import { getPasswordResetRedisKey, getRefreshTokenRedisKey } from '../../utils/redis-keys.util';
import { ResetPasswordUseCase } from '../reset-password.use-case';

describe('ResetPasswordUseCase', () => {
  let useCase: ResetPasswordUseCase;
  let usersRepository: DeepMockProxy<UsersRepository>;
  let hashService: DeepMockProxy<HashService>;
  let jwtService: DeepMockProxy<JwtService>;
  let config: DeepMockProxy<ConfigService>;
  let redis: DeepMockProxy<Redis>;

  const TOKEN = 'reset-token';
  const TOKEN_HASH = createHash('sha256').update(TOKEN).digest('hex');
  const USER_UUID = 'user-uuid';

  const dto: ResetPasswordDTO = {
    token: TOKEN,
    newPassword: 'NewPassw0rd!',
    confirmNewPassword: 'NewPassw0rd!',
  };

  const user = { id: 1, uuid: USER_UUID } as unknown as UserEntity;

  beforeEach(() => {
    usersRepository = mockDeep<UsersRepository>();
    hashService = mockDeep<HashService>();
    jwtService = mockDeep<JwtService>();
    config = mockDeep<ConfigService>();
    redis = mockDeep<Redis>();

    useCase = new ResetPasswordUseCase(usersRepository, hashService, jwtService, config, redis);

    config.get.mockReturnValue('reset-secret');
    jwtService.verify.mockReturnValue({ sub: USER_UUID });
    redis.get.mockResolvedValue(TOKEN_HASH);
    usersRepository.findByUuid.mockResolvedValue(user);
    hashService.hash.mockResolvedValue('hashed-new-password');
  });

  it('rejects when the confirmation does not match the new password, before verifying the token', async () => {
    await expect(
      useCase.execute({ ...dto, confirmNewPassword: 'something-else' }),
    ).rejects.toMatchObject({
      i18nKey: 'users.errors.passwordsMustMatch',
      status: 400,
    });
    expect(jwtService.verify).not.toHaveBeenCalled();
  });

  it('rejects a token that fails jwt verification (expired or malformed)', async () => {
    jwtService.verify.mockImplementation(() => {
      throw new Error('jwt expired');
    });

    await expect(useCase.execute(dto)).rejects.toMatchObject({
      i18nKey: 'auth.errors.passwordResetTokenInvalid',
      status: 401,
    });
  });

  it('rejects when no hash is stored for the user (token already used or never issued)', async () => {
    redis.get.mockResolvedValue(null);

    await expect(useCase.execute(dto)).rejects.toMatchObject({
      i18nKey: 'auth.errors.passwordResetTokenInvalid',
      status: 401,
    });
    expect(redis.get).toHaveBeenCalledWith(getPasswordResetRedisKey(USER_UUID));
  });

  it('rejects when the stored hash does not match the incoming token', async () => {
    redis.get.mockResolvedValue('a-different-hash');

    await expect(useCase.execute(dto)).rejects.toMatchObject({
      i18nKey: 'auth.errors.passwordResetTokenInvalid',
      status: 401,
    });
  });

  it('rejects when the user no longer exists', async () => {
    usersRepository.findByUuid.mockResolvedValue(null);

    await expect(useCase.execute(dto)).rejects.toMatchObject({
      i18nKey: 'users.errors.notFound',
      status: 404,
    });
  });

  it('hashes and persists the new password, then revokes the reset token and any active session', async () => {
    await useCase.execute(dto);

    expect(hashService.hash).toHaveBeenCalledWith(dto.newPassword);
    expect(usersRepository.update).toHaveBeenCalledWith(user.id, {
      passwordHash: 'hashed-new-password',
    });
    expect(redis.del).toHaveBeenCalledWith(getPasswordResetRedisKey(USER_UUID));
    expect(redis.del).toHaveBeenCalledWith(getRefreshTokenRedisKey(USER_UUID));
  });
});
