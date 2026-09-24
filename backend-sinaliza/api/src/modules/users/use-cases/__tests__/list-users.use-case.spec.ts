import { mockDeep } from 'jest-mock-extended';

import { UserQueryDTO } from '../../dtos/user-query.dto';
import { UserEntity } from '../../entities/user.entity';
import { EUserStatus } from '../../enums/user-status.enum';
import { UsersRepository } from '../../repositories/users.repository';
import { ListUsersUseCase } from '../list-users.use-case';

describe('ListUsersUseCase', () => {
  const usersRepository = mockDeep<UsersRepository>();
  const useCase = new ListUsersUseCase(usersRepository);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('forwards pagination and filters to the repository and maps the result', async () => {
    const user = {
      id: 1,
      uuid: 'user-uuid',
      email: 'user@example.com',
      userRoles: [],
    } as unknown as UserEntity;

    usersRepository.search.mockResolvedValue({
      data: [user],
      meta: { total: 1, page: 1, perPage: 10, lastPage: 1 },
    });

    const query: UserQueryDTO = {
      page: 1,
      perPage: 10,
      search: 'user@example.com',
      status: EUserStatus.ACTIVE,
      roleUuid: 'role-uuid',
    };

    const result = await useCase.execute(query);

    expect(usersRepository.search).toHaveBeenCalledWith(1, 10, {
      search: query.search,
      status: query.status,
      roleUuid: query.roleUuid,
    });
    expect(result.data).toHaveLength(1);
    expect(result.data[0].uuid).toBe(user.uuid);
    expect(result.meta.total).toBe(1);
  });
});
