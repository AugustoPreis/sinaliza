import { HttpStatus } from '@nestjs/common';
import { mockDeep } from 'jest-mock-extended';

import { UserEntity } from '../../entities/user.entity';
import { EUserStatus } from '../../enums/user-status.enum';
import { UsersRepository } from '../../repositories/users.repository';
import { RestoreUserAccessUseCase } from '../restore-user-access.use-case';

describe('RestoreUserAccessUseCase', () => {
  const usersRepository = mockDeep<UsersRepository>();
  const useCase = new RestoreUserAccessUseCase(usersRepository);

  const user = { id: 1, uuid: 'user-uuid', status: EUserStatus.INACTIVE } as UserEntity;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('throws when the user does not exist', async () => {
    usersRepository.findByUuid.mockResolvedValue(null);

    await expect(useCase.execute('missing-uuid')).rejects.toMatchObject({
      i18nKey: 'users.errors.notFound',
      status: HttpStatus.NOT_FOUND,
    });
  });

  it('sets the status to ACTIVE and reports access_revoked: false', async () => {
    usersRepository.findByUuid.mockResolvedValue(user);
    usersRepository.update.mockResolvedValue({ ...user, status: EUserStatus.ACTIVE });

    const result = await useCase.execute(user.uuid);

    expect(usersRepository.update).toHaveBeenCalledWith(user.id, { status: EUserStatus.ACTIVE });
    expect(result).toEqual({ id: user.uuid, access_revoked: false });
  });
});
