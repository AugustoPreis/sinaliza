import { Injectable } from '@nestjs/common';

import { IPaginatedResult } from '@shared/interfaces';

import { UserQueryDTO } from '../dtos/user-query.dto';
import { UserResponseDTO } from '../dtos/user-response.dto';
import { UsersRepository } from '../repositories/users.repository';

@Injectable()
export class ListUsersUseCase {
  constructor(private readonly usersRepository: UsersRepository) {}

  async execute(query: UserQueryDTO): Promise<IPaginatedResult<UserResponseDTO>> {
    const result = await this.usersRepository.search(query.page, query.perPage, {
      search: query.search,
      status: query.status,
      roleUuid: query.roleUuid,
    });

    return {
      data: result.data.map((u) => UserResponseDTO.from(u)),
      meta: result.meta,
    };
  }
}
