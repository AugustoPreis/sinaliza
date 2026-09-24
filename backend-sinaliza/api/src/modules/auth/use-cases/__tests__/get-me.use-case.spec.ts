import { HttpStatus } from '@nestjs/common';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';

import { AppException } from '@shared/exceptions';

import { PermissionEntity } from '../../../roles/entities/permission.entity';
import { RoleEntity } from '../../../roles/entities/role.entity';
import { UserRoleEntity } from '../../../users/entities/user-role.entity';
import { UserEntity } from '../../../users/entities/user.entity';
import { EUserStatus } from '../../../users/enums/user-status.enum';
import { UsersRepository } from '../../../users/repositories/users.repository';
import { GetMeUseCase } from '../get-me.use-case';

describe('GetMeUseCase', () => {
  let useCase: GetMeUseCase;
  let usersRepository: DeepMockProxy<UsersRepository>;

  const permission = { resource: 'users', action: 'read' } as unknown as PermissionEntity;
  const role = {
    uuid: 'role-uuid',
    name: 'admin',
    permissions: [permission],
  } as unknown as RoleEntity;
  const userRole = { role } as unknown as UserRoleEntity;

  const user = {
    uuid: 'user-uuid',
    email: 'user@example.com',
    name: 'Jane Doe',
    institutionalLink: null,
    status: EUserStatus.ACTIVE,
    userRoles: [userRole],
  } as unknown as UserEntity;

  beforeEach(() => {
    usersRepository = mockDeep<UsersRepository>();
    useCase = new GetMeUseCase(usersRepository);
  });

  it('throws when the user no longer exists', async () => {
    usersRepository.findByUuid.mockResolvedValue(null);

    await expect(useCase.execute('missing-uuid')).rejects.toMatchObject({
      i18nKey: 'users.errors.notFound',
      status: HttpStatus.NOT_FOUND,
    });
  });

  it('returns the user projection with roles and effective permissions', async () => {
    usersRepository.findByUuid.mockResolvedValue(user);

    const result = await useCase.execute(user.uuid);

    expect(result).toEqual({
      uuid: user.uuid,
      email: user.email,
      name: user.name,
      institutionalLink: user.institutionalLink,
      status: user.status,
      roles: [{ uuid: role.uuid, name: role.name }],
      permissions: ['users:read'],
    });
  });

  it('defaults roles and permissions to empty arrays when userRoles is not populated', async () => {
    usersRepository.findByUuid.mockResolvedValue({
      ...user,
      userRoles: undefined,
    } as unknown as UserEntity);

    const result = await useCase.execute(user.uuid);

    expect(result.roles).toEqual([]);
    expect(result.permissions).toEqual([]);
  });

  it('propagates AppException instances so the controller layer can map them', async () => {
    usersRepository.findByUuid.mockResolvedValue(null);

    await expect(useCase.execute(user.uuid)).rejects.toBeInstanceOf(AppException);
  });
});
