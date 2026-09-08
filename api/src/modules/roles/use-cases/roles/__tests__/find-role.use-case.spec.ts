import { HttpStatus } from '@nestjs/common';
import { mockDeep } from 'jest-mock-extended';

import { RoleEntity } from '../../../entities/role.entity';
import { RolesRepository } from '../../../repositories/roles.repository';
import { FindRoleUseCase } from '../find-role.use-case';

describe('FindRoleUseCase', () => {
  const rolesRepository = mockDeep<RolesRepository>();
  const useCase = new FindRoleUseCase(rolesRepository);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('throws when the role does not exist', async () => {
    rolesRepository.findByUuid.mockResolvedValue(null);

    await expect(useCase.execute('missing-uuid')).rejects.toMatchObject({
      i18nKey: 'roles.errors.notFound',
      status: HttpStatus.NOT_FOUND,
    });
  });

  it('returns the role as a response DTO when it exists', async () => {
    const role = {
      uuid: 'role-uuid',
      name: 'editor',
      description: null,
      isReserved: false,
      permissions: [],
    } as unknown as RoleEntity;

    rolesRepository.findByUuid.mockResolvedValue(role);

    const result = await useCase.execute(role.uuid);

    expect(result.uuid).toBe(role.uuid);
    expect(result.name).toBe(role.name);
  });
});
