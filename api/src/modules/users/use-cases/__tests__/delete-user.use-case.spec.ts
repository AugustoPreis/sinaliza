import { HttpStatus } from '@nestjs/common';
import { mockDeep } from 'jest-mock-extended';

import { UserEntity } from '../../entities/user.entity';
import { UsersRepository } from '../../repositories/users.repository';
import { DeleteUserUseCase } from '../delete-user.use-case';

describe('DeleteUserUseCase', () => {
  const usersRepository = mockDeep<UsersRepository>();
  const useCase = new DeleteUserUseCase(usersRepository);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('throws when the user does not exist', async () => {
    usersRepository.findByUuid.mockResolvedValue(null);

    await expect(useCase.execute('missing-uuid')).rejects.toMatchObject({
      i18nKey: 'users.errors.notFound',
      status: HttpStatus.NOT_FOUND,
    });
    expect(usersRepository.softDelete).not.toHaveBeenCalled();
  });

  it('soft-deletes the user when it exists', async () => {
    const user = { id: 7, uuid: 'user-uuid' } as UserEntity;

    usersRepository.findByUuid.mockResolvedValue(user);

    await useCase.execute(user.uuid);

    expect(usersRepository.softDelete).toHaveBeenCalledWith(user.id);
  });
});
