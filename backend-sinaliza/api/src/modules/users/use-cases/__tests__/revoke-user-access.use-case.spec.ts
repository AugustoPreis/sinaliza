import { HttpStatus } from '@nestjs/common';
import { mockDeep } from 'jest-mock-extended';

import { UserEntity } from '../../entities/user.entity';
import { EUserStatus } from '../../enums/user-status.enum';
import { UsersRepository } from '../../repositories/users.repository';
import { RevokeUserAccessUseCase } from '../revoke-user-access.use-case';

describe('RevokeUserAccessUseCase', () => {
  const usersRepository = mockDeep<UsersRepository>();
  const useCase = new RevokeUserAccessUseCase(usersRepository);

  const user = { id: 1, uuid: 'user-uuid', status: EUserStatus.ACTIVE } as UserEntity;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('throws when the user does not exist', async () => {
    usersRepository.findByUuid.mockResolvedValue(null);

    await expect(useCase.execute('missing-uuid', {})).rejects.toMatchObject({
      i18nKey: 'users.errors.notFound',
      status: HttpStatus.NOT_FOUND,
    });
  });

  it('sets the status to INACTIVE and reports access_revoked: true', async () => {
    usersRepository.findByUuid.mockResolvedValue(user);
    usersRepository.update.mockResolvedValue({ ...user, status: EUserStatus.INACTIVE });

    const result = await useCase.execute(user.uuid, { reason: 'left the institution' });

    expect(usersRepository.update).toHaveBeenCalledWith(user.id, { status: EUserStatus.INACTIVE });
    expect(result).toEqual({ id: user.uuid, access_revoked: true });
  });
});
