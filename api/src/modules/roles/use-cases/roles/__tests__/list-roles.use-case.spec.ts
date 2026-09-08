import { mockDeep } from 'jest-mock-extended';

import { PaginationQueryDTO } from '@shared/dtos/pagination-query.dto';

import { RoleEntity } from '../../../entities/role.entity';
import { RolesRepository } from '../../../repositories/roles.repository';
import { ListRolesUseCase } from '../list-roles.use-case';

describe('ListRolesUseCase', () => {
  const rolesRepository = mockDeep<RolesRepository>();
  const useCase = new ListRolesUseCase(rolesRepository);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('forwards the query to the repository and maps the result', async () => {
    const role = {
      uuid: 'role-uuid',
      name: 'editor',
      description: null,
      isReserved: false,
      permissions: [],
    } as unknown as RoleEntity;

    rolesRepository.findAll.mockResolvedValue({
      data: [role],
      meta: { total: 1, page: 1, perPage: 10, lastPage: 1 },
    });

    const query: PaginationQueryDTO = { page: 1, perPage: 10 };

    const result = await useCase.execute(query);

    expect(rolesRepository.findAll).toHaveBeenCalledWith(query);
    expect(result.data).toHaveLength(1);
    expect(result.data[0].uuid).toBe(role.uuid);
  });
});
