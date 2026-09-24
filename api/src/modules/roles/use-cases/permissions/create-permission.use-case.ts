import { HttpStatus, Injectable } from '@nestjs/common';

import { AppException } from '@shared/exceptions';
import { UuidService } from '@shared/services/uuid.service';

import { CreatePermissionDTO } from '../../dtos/create-permission.dto';
import { PermissionResponseDTO } from '../../dtos/permission-response.dto';
import { PermissionsRepository } from '../../repositories/permissions.repository';

@Injectable()
export class CreatePermissionUseCase {
  constructor(
    private readonly permissionsRepository: PermissionsRepository,
    private readonly uuidService: UuidService,
  ) {}

  async execute(dto: CreatePermissionDTO): Promise<PermissionResponseDTO> {
    const existing = await this.permissionsRepository.findByResourceAction(
      dto.resource,
      dto.action,
    );

    if (existing) {
      throw AppException.from('roles.errors.permissionExists', HttpStatus.CONFLICT, {
        args: { resource: dto.resource, action: dto.action },
      });
    }

    const permission = await this.permissionsRepository.create({
      uuid: this.uuidService.generate(),
      resource: dto.resource,
      action: dto.action,
      description: dto.description ?? null,
    });

    return PermissionResponseDTO.from(permission);
  }
}
