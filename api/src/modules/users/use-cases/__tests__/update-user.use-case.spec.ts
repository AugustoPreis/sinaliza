import { HttpStatus } from '@nestjs/common';
import { mockDeep } from 'jest-mock-extended';

import { RoleEntity } from '@modules/roles/entities/role.entity';

import { createMockRepository } from '../../../../../test/support/mock-repository';
import { UpdateUserDTO } from '../../dtos/update-user.dto';
import { UserEntity } from '../../entities/user.entity';
import { UsersRepository } from '../../repositories/users.repository';
import { UpdateUserUseCase } from '../update-user.use-case';

describe('UpdateUserUseCase', () => {
  const usersRepository = mockDeep<UsersRepository>();
  const roleRepo = createMockRepository<RoleEntity>();

  const useCase = new UpdateUserUseCase(usersRepository, roleRepo);

  const user = {
    id: 1,
    uuid: 'user-uuid',
    email: 'user@example.com',
    userRoles: [],
  } as unknown as UserEntity;

  beforeEach(() => {
    jest.clearAllMocks();
    usersRepository.findByUuid.mockResolvedValue(user);
    usersRepository.findByEmail.mockResolvedValue(null);
    usersRepository.update.mockResolvedValue(user);
  });

  it('throws when the user does not exist', async () => {
    usersRepository.findByUuid.mockResolvedValue(null);

    await expect(useCase.execute('missing-uuid', {})).rejects.toMatchObject({
      i18nKey: 'users.errors.notFound',
      status: HttpStatus.NOT_FOUND,
    });
  });

  it('throws when the new email is already taken by another user', async () => {
    usersRepository.findByEmail.mockResolvedValue({ id: 2 } as UserEntity);

    const dto: UpdateUserDTO = { email: 'taken@example.com' };

    await expect(useCase.execute(user.uuid, dto)).rejects.toMatchObject({
      i18nKey: 'users.errors.emailTaken',
      status: HttpStatus.CONFLICT,
    });
  });

  it('does not check for email conflicts when the email is unchanged', async () => {
    const dto: UpdateUserDTO = { email: user.email.toUpperCase() };

    await useCase.execute(user.uuid, dto);

    expect(usersRepository.findByEmail).not.toHaveBeenCalled();
  });

  it('throws when a role uuid does not exist', async () => {
    roleRepo.findOne.mockResolvedValue(null);

    const dto: UpdateUserDTO = { roleUuids: ['missing-role'] };

    await expect(useCase.execute(user.uuid, dto)).rejects.toMatchObject({
      i18nKey: 'roles.errors.notFound',
      status: HttpStatus.NOT_FOUND,
    });
  });

  it('leaves roles untouched when roleUuids is omitted', async () => {
    await useCase.execute(user.uuid, {});

    expect(usersRepository.setRoles).not.toHaveBeenCalled();
  });

  it('replaces roles with an empty set when roleUuids is an empty array', async () => {
    await useCase.execute(user.uuid, { roleUuids: [] });

    expect(usersRepository.setRoles).toHaveBeenCalledWith(user.id, []);
  });

  it('updates the user fields and roles when provided', async () => {
    const role = { id: 9, uuid: 'role-uuid' } as RoleEntity;

    roleRepo.findOne.mockResolvedValue(role);

    const dto: UpdateUserDTO = {
      email: 'new@example.com',
      name: 'New Name',
      roleUuids: [role.uuid],
    };

    await useCase.execute(user.uuid, dto);

    expect(usersRepository.setRoles).toHaveBeenCalledWith(user.id, [role.id]);
    expect(usersRepository.update).toHaveBeenCalledWith(user.id, {
      email: 'new@example.com',
      name: dto.name,
      institutionalId: undefined,
      institutionalLink: undefined,
    });
  });
});
