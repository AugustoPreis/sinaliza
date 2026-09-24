import { HttpStatus, Injectable } from '@nestjs/common';

import { AppException } from '@shared/exceptions';

import { PermissionResponseDTO } from '../../dtos/permission-response.dto';
import { UpdatePermissionDTO } from '../../dtos/update-permission.dto';
import { PermissionsRepository } from '../../repositories/permissions.repository';

@Injectable()
export class UpdatePermissionUseCase {
  constructor(private readonly permissionsRepository: PermissionsRepository) {}

  async execute(uuid: string, dto: UpdatePermissionDTO): Promise<PermissionResponseDTO> {
    const permission = await this.permissionsRepository.findByUuid(uuid);

    if (!permission) {
      throw AppException.from('roles.errors.permissionNotFoundByUuid', HttpStatus.NOT_FOUND);
    }

    const nextResource = dto.resource ?? permission.resource;
    const nextAction = dto.action ?? permission.action;

    if (nextResource !== permission.resource || nextAction !== permission.action) {
      const existing = await this.permissionsRepository.findByResourceAction(
        nextResource,
        nextAction,
      );

      if (existing) {
        throw AppException.from('roles.errors.permissionExists', HttpStatus.CONFLICT, {
          args: { resource: nextResource, action: nextAction },
        });
      }
    }

    const updated = await this.permissionsRepository.update(permission.id, {
      resource: dto.resource,
      action: dto.action,
      description: dto.description,
    });

    return PermissionResponseDTO.from(updated);
  }
}
