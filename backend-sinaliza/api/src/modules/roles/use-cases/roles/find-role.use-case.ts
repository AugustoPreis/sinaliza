import { HttpStatus, Injectable } from '@nestjs/common';

import { AppException } from '@shared/exceptions';

import { RoleResponseDTO } from '../../dtos/role-response.dto';
import { RolesRepository } from '../../repositories/roles.repository';

@Injectable()
export class FindRoleUseCase {
  constructor(private readonly rolesRepository: RolesRepository) {}

  async execute(uuid: string): Promise<RoleResponseDTO> {
    const role = await this.rolesRepository.findByUuid(uuid);

    if (!role) {
      throw AppException.from('roles.errors.notFound', HttpStatus.NOT_FOUND);
    }

    return RoleResponseDTO.from(role);
  }
}
