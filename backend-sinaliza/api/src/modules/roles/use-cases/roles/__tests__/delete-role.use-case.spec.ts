import { HttpStatus } from '@nestjs/common';
import { mockDeep } from 'jest-mock-extended';

import { RoleEntity } from '../../../entities/role.entity';
import { RolesRepository } from '../../../repositories/roles.repository';
import { DeleteRoleUseCase } from '../delete-role.use-case';

describe('DeleteRoleUseCase', () => {
  const rolesRepository = mockDeep<RolesRepository>();
  const useCase = new DeleteRoleUseCase(rolesRepository);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('throws when the role does not exist', async () => {
    rolesRepository.findByUuid.mockResolvedValue(null);

    await expect(useCase.execute('missing-uuid')).rejects.toMatchObject({
      i18nKey: 'roles.errors.notFound',
      status: HttpStatus.NOT_FOUND,
    });
    expect(rolesRepository.delete).not.toHaveBeenCalled();
  });

  it('throws when the role is reserved', async () => {
    const role = { id: 1, uuid: 'role-uuid', isReserved: true } as RoleEntity;

    rolesRepository.findByUuid.mockResolvedValue(role);

    await expect(useCase.execute(role.uuid)).rejects.toMatchObject({
      i18nKey: 'roles.errors.cannotDeleteReserved',
      status: HttpStatus.FORBIDDEN,
    });
    expect(rolesRepository.delete).not.toHaveBeenCalled();
  });

  it('deletes the role when it exists and is not reserved', async () => {
    const role = { id: 1, uuid: 'role-uuid', isReserved: false } as RoleEntity;

    rolesRepository.findByUuid.mockResolvedValue(role);

    await useCase.execute(role.uuid);

    expect(rolesRepository.delete).toHaveBeenCalledWith(role.id);
  });
});
