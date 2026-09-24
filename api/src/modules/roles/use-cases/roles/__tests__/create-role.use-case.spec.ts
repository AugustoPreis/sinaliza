import { HttpStatus } from '@nestjs/common';
import { mockDeep } from 'jest-mock-extended';

import { UuidService } from '@shared/services/uuid.service';

import { CreateRoleDTO } from '../../../dtos/create-role.dto';
import { RoleEntity } from '../../../entities/role.entity';
import { RolesRepository } from '../../../repositories/roles.repository';
import { CreateRoleUseCase } from '../create-role.use-case';

describe('CreateRoleUseCase', () => {
  const rolesRepository = mockDeep<RolesRepository>();
  const uuidService = mockDeep<UuidService>();

  const useCase = new CreateRoleUseCase(rolesRepository, uuidService);

  const dto: CreateRoleDTO = { name: 'editor' };

  beforeEach(() => {
    jest.clearAllMocks();
    rolesRepository.findByName.mockResolvedValue(null);
    uuidService.generate.mockReturnValue('generated-uuid');
  });

  it('throws when the name is already taken', async () => {
    rolesRepository.findByName.mockResolvedValue({ id: 1 } as RoleEntity);

    await expect(useCase.execute(dto)).rejects.toMatchObject({
      i18nKey: 'roles.errors.nameTaken',
      status: HttpStatus.CONFLICT,
    });
  });

  it('creates the role when the name is available', async () => {
    const created = {
      uuid: 'generated-uuid',
      name: dto.name,
      description: null,
      permissions: [],
    } as unknown as RoleEntity;

    rolesRepository.create.mockResolvedValue(created);

    const result = await useCase.execute(dto);

    expect(rolesRepository.create).toHaveBeenCalledWith({
      uuid: 'generated-uuid',
      name: dto.name,
      description: null,
    });
    expect(result.uuid).toBe(created.uuid);
  });
});
