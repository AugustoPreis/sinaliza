import { HttpStatus } from '@nestjs/common';
import { mockDeep } from 'jest-mock-extended';

import { RoleEntity } from '../../../entities/role.entity';
import { RolesRepository } from '../../../repositories/roles.repository';
import { UpdateRoleUseCase } from '../update-role.use-case';

describe('UpdateRoleUseCase', () => {
  const rolesRepository = mockDeep<RolesRepository>();
  const useCase = new UpdateRoleUseCase(rolesRepository);

  const role = {
    id: 1,
    uuid: 'role-uuid',
    name: 'editor',
    description: null,
    isReserved: false,
    permissions: [],
  } as unknown as RoleEntity;

  beforeEach(() => {
    jest.clearAllMocks();
    rolesRepository.findByUuid.mockResolvedValue(role);
    rolesRepository.findByName.mockResolvedValue(null);
    rolesRepository.update.mockResolvedValue(role);
  });

  it('throws when the role does not exist', async () => {
    rolesRepository.findByUuid.mockResolvedValue(null);

    await expect(useCase.execute('missing-uuid', {})).rejects.toMatchObject({
      i18nKey: 'roles.errors.notFound',
      status: HttpStatus.NOT_FOUND,
    });
  });

  it('throws when the new name is already taken by another role', async () => {
    rolesRepository.findByName.mockResolvedValue({ id: 2 } as RoleEntity);

    await expect(useCase.execute(role.uuid, { name: 'admin' })).rejects.toMatchObject({
      i18nKey: 'roles.errors.nameTaken',
      status: HttpStatus.CONFLICT,
    });
  });

  it('does not check for name conflicts when the name is unchanged', async () => {
    await useCase.execute(role.uuid, { name: role.name, description: 'updated' });

    expect(rolesRepository.findByName).not.toHaveBeenCalled();
  });

  it('updates the role when there is no conflict', async () => {
    const updated = { ...role, name: 'admin' };

    rolesRepository.update.mockResolvedValue(updated);

    const result = await useCase.execute(role.uuid, { name: 'admin' });

    expect(rolesRepository.update).toHaveBeenCalledWith(role.id, {
      name: 'admin',
      description: undefined,
    });
    expect(result.name).toBe('admin');
  });
});
