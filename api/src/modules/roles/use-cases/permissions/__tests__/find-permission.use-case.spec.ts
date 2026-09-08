import { HttpStatus } from '@nestjs/common';
import { mockDeep } from 'jest-mock-extended';

import { PermissionEntity } from '../../../entities/permission.entity';
import { PermissionsRepository } from '../../../repositories/permissions.repository';
import { FindPermissionUseCase } from '../find-permission.use-case';

describe('FindPermissionUseCase', () => {
  const permissionsRepository = mockDeep<PermissionsRepository>();
  const useCase = new FindPermissionUseCase(permissionsRepository);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('throws when the permission does not exist', async () => {
    permissionsRepository.findByUuid.mockResolvedValue(null);

    await expect(useCase.execute('missing-uuid')).rejects.toMatchObject({
      i18nKey: 'roles.errors.permissionNotFoundByUuid',
      status: HttpStatus.NOT_FOUND,
    });
  });

  it('returns the permission as a response DTO when it exists', async () => {
    const permission = {
      uuid: 'permission-uuid',
      resource: 'users',
      action: 'read',
      description: null,
    } as PermissionEntity;

    permissionsRepository.findByUuid.mockResolvedValue(permission);

    const result = await useCase.execute(permission.uuid);

    expect(result.uuid).toBe(permission.uuid);
    expect(result.resource).toBe(permission.resource);
  });
});
