import { Injectable } from '@nestjs/common';

import { PaginationQueryDTO } from '@shared/dtos/pagination-query.dto';
import { IPaginatedResult } from '@shared/interfaces';

import { RoleResponseDTO } from '../../dtos/role-response.dto';
import { RolesRepository } from '../../repositories/roles.repository';

@Injectable()
export class ListRolesUseCase {
  constructor(private readonly rolesRepository: RolesRepository) {}

  async execute(query: PaginationQueryDTO): Promise<IPaginatedResult<RoleResponseDTO>> {
    const result = await this.rolesRepository.findAll(query);

    return {
      data: result.data.map((r) => RoleResponseDTO.from(r)),
      meta: result.meta,
    };
  }
}
