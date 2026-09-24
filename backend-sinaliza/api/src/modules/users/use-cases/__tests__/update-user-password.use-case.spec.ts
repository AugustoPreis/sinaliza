import { HttpStatus } from '@nestjs/common';
import Redis from 'ioredis';
import { mockDeep } from 'jest-mock-extended';

import { HashService } from '@shared/services/hash.service';

import { getRefreshTokenRedisKey } from '../../../auth/utils/redis-keys.util';
import { UpdateUserPasswordDTO } from '../../dtos/update-user-password.dto';
import { UserEntity } from '../../entities/user.entity';
import { UsersRepository } from '../../repositories/users.repository';
import { UpdateUserPasswordUseCase } from '../update-user-password.use-case';

describe('UpdateUserPasswordUseCase', () => {
  const usersRepository = mockDeep<UsersRepository>();
  const hashService = mockDeep<HashService>();
  const redis = mockDeep<Redis>();

  const useCase = new UpdateUserPasswordUseCase(usersRepository, hashService, redis);

  const user = { id: 1, uuid: 'user-uuid', passwordHash: 'old-hash' } as UserEntity;

  const baseDto: UpdateUserPasswordDTO = {
    currentPassword: 'CurrentP@ss1',
    newPassword: 'NewP@ssword1',
    confirmNewPassword: 'NewP@ssword1',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    usersRepository.findByUuidWithPassword.mockResolvedValue(user);
    hashService.compare.mockResolvedValue(true);
    hashService.hash.mockResolvedValue('new-hash');
  });

  it('throws when the user does not exist', async () => {
    usersRepository.findByUuidWithPassword.mockResolvedValue(null);

    await expect(useCase.execute(user.uuid, baseDto)).rejects.toMatchObject({
      i18nKey: 'users.errors.notFound',
      status: HttpStatus.NOT_FOUND,
    });
  });

  it('throws when the new password matches the current one', async () => {
    const dto = {
      ...baseDto,
      newPassword: baseDto.currentPassword,
      confirmNewPassword: baseDto.currentPassword,
    };

    await expect(useCase.execute(user.uuid, dto)).rejects.toMatchObject({
      i18nKey: 'users.errors.passwordsMustBeDifferent',
      status: HttpStatus.BAD_REQUEST,
    });
  });

  it('throws when the new password and confirmation do not match', async () => {
    const dto = { ...baseDto, confirmNewPassword: 'SomethingElse1!' };

    await expect(useCase.execute(user.uuid, dto)).rejects.toMatchObject({
      i18nKey: 'users.errors.passwordsMustMatch',
      status: HttpStatus.BAD_REQUEST,
    });
  });

  it('throws when the current password is incorrect', async () => {
    hashService.compare.mockResolvedValue(false);

    await expect(useCase.execute(user.uuid, baseDto)).rejects.toMatchObject({
      i18nKey: 'users.errors.invalidCurrentPassword',
      status: HttpStatus.BAD_REQUEST,
    });
  });

  it('updates the password hash and revokes the refresh token', async () => {
    await useCase.execute(user.uuid, baseDto);

    expect(hashService.compare).toHaveBeenCalledWith(baseDto.currentPassword, user.passwordHash);
    expect(usersRepository.update).toHaveBeenCalledWith(user.id, { passwordHash: 'new-hash' });
    expect(redis.del).toHaveBeenCalledWith(getRefreshTokenRedisKey(user.uuid));
  });
});
