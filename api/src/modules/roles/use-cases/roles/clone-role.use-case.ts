import { HttpStatus, Injectable } from '@nestjs/common';

import { AppException } from '@shared/exceptions';
import { UuidService } from '@shared/services/uuid.service';

import { CreateRoleDTO } from '../../dtos/create-role.dto';
import { RoleResponseDTO } from '../../dtos/role-response.dto';
import { RolesRepository } from '../../repositories/roles.repository';

@Injectable()
export class CloneRoleUseCase {
  constructor(
    private readonly rolesRepository: RolesRepository,
    private readonly uuidService: UuidService,
  ) {}

  async execute(sourceUuid: string, dto: CreateRoleDTO): Promise<RoleResponseDTO> {
    const source = await this.rolesRepository.findByUuid(sourceUuid);

    if (!source) {
      throw AppException.from('roles.errors.notFound', HttpStatus.NOT_FOUND);
    }

    const existing = await this.rolesRepository.findByName(dto.name);

    if (existing) {
      throw AppException.from('roles.errors.nameTaken', HttpStatus.CONFLICT, {
        args: { name: dto.name },
      });
    }

    const role = await this.rolesRepository.create({
      uuid: this.uuidService.generate(),
      name: dto.name,
      description: dto.description ?? null,
      permissions: source.permissions,
    });

    return RoleResponseDTO.from(role);
  }
}
