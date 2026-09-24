import { HttpStatus, Injectable } from '@nestjs/common';

import { AppException } from '@shared/exceptions';

import { PermissionsRepository } from '../../repositories/permissions.repository';

@Injectable()
export class DeletePermissionUseCase {
  constructor(private readonly permissionsRepository: PermissionsRepository) {}

  async execute(uuid: string): Promise<void> {
    const permission = await this.permissionsRepository.findByUuid(uuid);

    if (!permission) {
      throw AppException.from('roles.errors.permissionNotFoundByUuid', HttpStatus.NOT_FOUND);
    }

    await this.permissionsRepository.delete(permission.id);
  }
}
