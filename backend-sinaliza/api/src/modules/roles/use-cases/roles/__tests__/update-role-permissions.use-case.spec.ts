import { HttpStatus } from '@nestjs/common';
import { mockDeep } from 'jest-mock-extended';

import { PermissionEntity } from '../../../entities/permission.entity';
import { RoleEntity } from '../../../entities/role.entity';
import { PermissionsRepository } from '../../../repositories/permissions.repository';
import { RolesRepository } from '../../../repositories/roles.repository';
import { UpdateRolePermissionsUseCase } from '../update-role-permissions.use-case';

describe('UpdateRolePermissionsUseCase', () => {
  const rolesRepository = mockDeep<RolesRepository>();
  const permissionsRepository = mockDeep<PermissionsRepository>();

  const useCase = new UpdateRolePermissionsUseCase(rolesRepository, permissionsRepository);

  const role = { id: 1, uuid: 'role-uuid' } as RoleEntity;

  beforeEach(() => {
    jest.clearAllMocks();
    rolesRepository.findByUuid.mockResolvedValue(role);
  });

  it('throws when the role does not exist', async () => {
    rolesRepository.findByUuid.mockResolvedValue(null);

    await expect(useCase.execute('missing-uuid', { permissions: [] })).rejects.toMatchObject({
      i18nKey: 'roles.errors.notFound',
      status: HttpStatus.NOT_FOUND,
    });
  });

  it('throws when some requested permission pairs cannot be found', async () => {
    const found = [{ id: 1, resource: 'users', action: 'read' } as PermissionEntity];

    permissionsRepository.findByResourceActionPairs.mockResolvedValue(found);

    await expect(
      useCase.execute(role.uuid, {
        permissions: [
          { resource: 'users', action: 'read' },
          { resource: 'users', action: 'delete' },
        ],
      }),
    ).rejects.toMatchObject({
      i18nKey: 'roles.errors.permissionNotFound',
      status: HttpStatus.NOT_FOUND,
      args: { pairs: 'users:delete' },
    });
    expect(rolesRepository.setPermissions).not.toHaveBeenCalled();
  });

  it('sets the resolved permissions and returns the updated role', async () => {
    const permissions = [{ id: 1, resource: 'users', action: 'read' } as PermissionEntity];
    const updated = { ...role, permissions };

    permissionsRepository.findByResourceActionPairs.mockResolvedValue(permissions);
    rolesRepository.findByUuid.mockResolvedValueOnce(role).mockResolvedValueOnce(updated);

    const result = await useCase.execute(role.uuid, {
      permissions: [{ resource: 'users', action: 'read' }],
    });

    expect(rolesRepository.setPermissions).toHaveBeenCalledWith(role.id, [permissions[0].id]);
    expect(result.permissions).toHaveLength(1);
  });
});
