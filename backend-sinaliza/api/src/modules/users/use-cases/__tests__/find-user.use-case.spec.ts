import { HttpStatus } from '@nestjs/common';
import { mockDeep } from 'jest-mock-extended';

import { UserEntity } from '../../entities/user.entity';
import { UsersRepository } from '../../repositories/users.repository';
import { FindUserUseCase } from '../find-user.use-case';

describe('FindUserUseCase', () => {
  const usersRepository = mockDeep<UsersRepository>();
  const useCase = new FindUserUseCase(usersRepository);

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

  it('returns the user as a response DTO when it exists', async () => {
    const user = {
      id: 1,
      uuid: 'user-uuid',
      email: 'user@example.com',
      userRoles: [],
    } as unknown as UserEntity;

    usersRepository.findByUuid.mockResolvedValue(user);

    const result = await useCase.execute(user.uuid);

    expect(result.uuid).toBe(user.uuid);
    expect(result.email).toBe(user.email);
  });
});
