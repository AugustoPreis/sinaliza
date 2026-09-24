import { HttpStatus } from '@nestjs/common';
import { mockDeep } from 'jest-mock-extended';

import { UuidService } from '@shared/services/uuid.service';

import { CreateRoleDTO } from '../../../dtos/create-role.dto';
import { PermissionEntity } from '../../../entities/permission.entity';
import { RoleEntity } from '../../../entities/role.entity';
import { RolesRepository } from '../../../repositories/roles.repository';
import { CloneRoleUseCase } from '../clone-role.use-case';

describe('CloneRoleUseCase', () => {
  const rolesRepository = mockDeep<RolesRepository>();
  const uuidService = mockDeep<UuidService>();

  const useCase = new CloneRoleUseCase(rolesRepository, uuidService);

  const permissions = [{ id: 1, resource: 'users', action: 'read' } as PermissionEntity];
  const source = {
    id: 1,
    uuid: 'source-uuid',
    name: 'editor',
    permissions,
  } as RoleEntity;

  const dto: CreateRoleDTO = { name: 'editor-copy' };

  beforeEach(() => {
    jest.clearAllMocks();
    rolesRepository.findByUuid.mockResolvedValue(source);
    rolesRepository.findByName.mockResolvedValue(null);
    uuidService.generate.mockReturnValue('generated-uuid');
  });

  it('throws when the source role does not exist', async () => {
    rolesRepository.findByUuid.mockResolvedValue(null);

    await expect(useCase.execute('missing-uuid', dto)).rejects.toMatchObject({
      i18nKey: 'roles.errors.notFound',
      status: HttpStatus.NOT_FOUND,
    });
  });

  it('throws when the target name is already taken', async () => {
    rolesRepository.findByName.mockResolvedValue({ id: 2 } as RoleEntity);

    await expect(useCase.execute(source.uuid, dto)).rejects.toMatchObject({
      i18nKey: 'roles.errors.nameTaken',
      status: HttpStatus.CONFLICT,
    });
  });

  it('creates a new role copying the source permissions', async () => {
    const cloned = { uuid: 'generated-uuid', name: dto.name, permissions } as RoleEntity;

    rolesRepository.create.mockResolvedValue(cloned);

    const result = await useCase.execute(source.uuid, dto);

    expect(rolesRepository.create).toHaveBeenCalledWith({
      uuid: 'generated-uuid',
      name: dto.name,
      description: null,
      permissions: source.permissions,
    });
    expect(result.uuid).toBe(cloned.uuid);
    expect(result.permissions).toHaveLength(1);
  });
});
