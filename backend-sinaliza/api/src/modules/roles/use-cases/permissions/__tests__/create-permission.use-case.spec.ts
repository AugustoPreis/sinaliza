import { HttpStatus } from '@nestjs/common';
import { mockDeep } from 'jest-mock-extended';

import { UuidService } from '@shared/services/uuid.service';

import { CreatePermissionDTO } from '../../../dtos/create-permission.dto';
import { PermissionEntity } from '../../../entities/permission.entity';
import { PermissionsRepository } from '../../../repositories/permissions.repository';
import { CreatePermissionUseCase } from '../create-permission.use-case';

describe('CreatePermissionUseCase', () => {
  const permissionsRepository = mockDeep<PermissionsRepository>();
  const uuidService = mockDeep<UuidService>();

  const useCase = new CreatePermissionUseCase(permissionsRepository, uuidService);

  const dto: CreatePermissionDTO = { resource: 'users', action: 'read' };

  beforeEach(() => {
    jest.clearAllMocks();
    permissionsRepository.findByResourceAction.mockResolvedValue(null);
    uuidService.generate.mockReturnValue('generated-uuid');
  });

  it('throws when a permission with the same resource and action already exists', async () => {
    permissionsRepository.findByResourceAction.mockResolvedValue({ id: 1 } as PermissionEntity);

    await expect(useCase.execute(dto)).rejects.toMatchObject({
      i18nKey: 'roles.errors.permissionExists',
      status: HttpStatus.CONFLICT,
    });
  });

  it('creates the permission when it does not already exist', async () => {
    const created = {
      uuid: 'generated-uuid',
      resource: dto.resource,
      action: dto.action,
      description: null,
    } as PermissionEntity;

    permissionsRepository.create.mockResolvedValue(created);

    const result = await useCase.execute(dto);

    expect(permissionsRepository.create).toHaveBeenCalledWith({
      uuid: 'generated-uuid',
      resource: dto.resource,
      action: dto.action,
      description: null,
    });
    expect(result.uuid).toBe(created.uuid);
  });
});
