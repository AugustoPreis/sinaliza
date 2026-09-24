import { HttpStatus, Injectable } from '@nestjs/common';

import { AppException } from '@shared/exceptions';

import { RolesRepository } from '../../repositories/roles.repository';

@Injectable()
export class DeleteRoleUseCase {
  constructor(private readonly rolesRepository: RolesRepository) {}

  async execute(uuid: string): Promise<void> {
    const role = await this.rolesRepository.findByUuid(uuid);

    if (!role) {
      throw AppException.from('roles.errors.notFound', HttpStatus.NOT_FOUND);
    }

    if (role.isReserved) {
      throw AppException.from('roles.errors.cannotDeleteReserved', HttpStatus.FORBIDDEN);
    }

    await this.rolesRepository.delete(role.id);
  }
}
