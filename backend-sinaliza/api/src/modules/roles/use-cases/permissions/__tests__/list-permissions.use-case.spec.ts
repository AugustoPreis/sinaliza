import { mockDeep } from 'jest-mock-extended';

import { ListPermissionDTO } from '../../../dtos/list-permission.dto';
import { PermissionEntity } from '../../../entities/permission.entity';
import { PermissionsRepository } from '../../../repositories/permissions.repository';
import { ListPermissionsUseCase } from '../list-permissions.use-case';

describe('ListPermissionsUseCase', () => {
  const permissionsRepository = mockDeep<PermissionsRepository>();
  const useCase = new ListPermissionsUseCase(permissionsRepository);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('forwards the query to the repository and maps the result', async () => {
    const permission = {
      uuid: 'permission-uuid',
      resource: 'users',
      action: 'read',
      description: null,
    } as PermissionEntity;

    permissionsRepository.findAll.mockResolvedValue({
      data: [permission],
      meta: { total: 1, page: 1, perPage: 10, lastPage: 1 },
    });

    const query: ListPermissionDTO = { page: 1, perPage: 10, resource: 'users' };

    const result = await useCase.execute(query);

    expect(permissionsRepository.findAll).toHaveBeenCalledWith(query);
    expect(result.data).toHaveLength(1);
    expect(result.data[0].uuid).toBe(permission.uuid);
  });
});
