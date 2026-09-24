import { HttpStatus } from '@nestjs/common';
import { mockDeep } from 'jest-mock-extended';

import { PermissionEntity } from '../../../entities/permission.entity';
import { PermissionsRepository } from '../../../repositories/permissions.repository';
import { DeletePermissionUseCase } from '../delete-permission.use-case';

describe('DeletePermissionUseCase', () => {
  const permissionsRepository = mockDeep<PermissionsRepository>();
  const useCase = new DeletePermissionUseCase(permissionsRepository);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('throws when the permission does not exist', async () => {
    permissionsRepository.findByUuid.mockResolvedValue(null);

    await expect(useCase.execute('missing-uuid')).rejects.toMatchObject({
      i18nKey: 'roles.errors.permissionNotFoundByUuid',
      status: HttpStatus.NOT_FOUND,
    });
    expect(permissionsRepository.delete).not.toHaveBeenCalled();
  });

  it('deletes the permission when it exists', async () => {
    const permission = { id: 3, uuid: 'permission-uuid' } as PermissionEntity;

    permissionsRepository.findByUuid.mockResolvedValue(permission);

    await useCase.execute(permission.uuid);

    expect(permissionsRepository.delete).toHaveBeenCalledWith(permission.id);
  });
});
