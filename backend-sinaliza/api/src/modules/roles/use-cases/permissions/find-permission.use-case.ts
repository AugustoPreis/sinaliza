import { HttpStatus, Injectable } from '@nestjs/common';

import { AppException } from '@shared/exceptions';

import { PermissionResponseDTO } from '../../dtos/permission-response.dto';
import { PermissionsRepository } from '../../repositories/permissions.repository';

@Injectable()
export class FindPermissionUseCase {
  constructor(private readonly permissionsRepository: PermissionsRepository) {}

  async execute(uuid: string): Promise<PermissionResponseDTO> {
    const permission = await this.permissionsRepository.findByUuid(uuid);

    if (!permission) {
      throw AppException.from('roles.errors.permissionNotFoundByUuid', HttpStatus.NOT_FOUND);
    }

    return PermissionResponseDTO.from(permission);
  }
}
