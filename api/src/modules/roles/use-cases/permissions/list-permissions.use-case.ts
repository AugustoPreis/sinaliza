import { Injectable } from '@nestjs/common';

import { IPaginatedResult } from '@shared/interfaces';

import { ListPermissionDTO } from '@modules/roles/dtos/list-permission.dto';

import { PermissionResponseDTO } from '../../dtos/permission-response.dto';
import { PermissionsRepository } from '../../repositories/permissions.repository';

@Injectable()
export class ListPermissionsUseCase {
  constructor(private readonly permissionsRepository: PermissionsRepository) {}

  async execute(query: ListPermissionDTO): Promise<IPaginatedResult<PermissionResponseDTO>> {
    const result = await this.permissionsRepository.findAll(query);

    return {
      data: result.data.map((p) => PermissionResponseDTO.from(p)),
      meta: result.meta,
    };
  }
}
