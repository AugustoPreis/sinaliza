import { HttpStatus } from '@nestjs/common';
import { mockDeep } from 'jest-mock-extended';

import { PermissionEntity } from '../../../entities/permission.entity';
import { PermissionsRepository } from '../../../repositories/permissions.repository';
import { UpdatePermissionUseCase } from '../update-permission.use-case';

describe('UpdatePermissionUseCase', () => {
  const permissionsRepository = mockDeep<PermissionsRepository>();
  const useCase = new UpdatePermissionUseCase(permissionsRepository);

  const permission = {
    id: 1,
    uuid: 'permission-uuid',
    resource: 'users',
    action: 'read',
    description: null,
  } as PermissionEntity;

  beforeEach(() => {
    jest.clearAllMocks();
    permissionsRepository.findByUuid.mockResolvedValue(permission);
    permissionsRepository.findByResourceAction.mockResolvedValue(null);
    permissionsRepository.update.mockResolvedValue(permission);
  });

  it('throws when the permission does not exist', async () => {
    permissionsRepository.findByUuid.mockResolvedValue(null);

    await expect(useCase.execute('missing-uuid', {})).rejects.toMatchObject({
      i18nKey: 'roles.errors.permissionNotFoundByUuid',
      status: HttpStatus.NOT_FOUND,
    });
  });

  it('throws when the new resource/action pair is already taken by another permission', async () => {
    permissionsRepository.findByResourceAction.mockResolvedValue({ id: 2 } as PermissionEntity);

    await expect(useCase.execute(permission.uuid, { action: 'write' })).rejects.toMatchObject({
      i18nKey: 'roles.errors.permissionExists',
      status: HttpStatus.CONFLICT,
    });
  });

  it('does not check for conflicts when the resource/action pair is unchanged', async () => {
    await useCase.execute(permission.uuid, {
      resource: permission.resource,
      action: permission.action,
      description: 'updated',
    });

    expect(permissionsRepository.findByResourceAction).not.toHaveBeenCalled();
  });

  it('updates the permission when there is no conflict', async () => {
    const updated = { ...permission, action: 'write' };

    permissionsRepository.update.mockResolvedValue(updated);

    const result = await useCase.execute(permission.uuid, { action: 'write' });

    expect(permissionsRepository.update).toHaveBeenCalledWith(permission.id, {
      resource: undefined,
      action: 'write',
      description: undefined,
    });
    expect(result.action).toBe('write');
  });
});
