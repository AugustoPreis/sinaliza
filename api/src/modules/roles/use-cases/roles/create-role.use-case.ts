import { HttpStatus, Injectable } from '@nestjs/common';

import { AppException } from '@shared/exceptions';
import { UuidService } from '@shared/services/uuid.service';

import { CreateRoleDTO } from '../../dtos/create-role.dto';
import { RoleResponseDTO } from '../../dtos/role-response.dto';
import { RolesRepository } from '../../repositories/roles.repository';

@Injectable()
export class CreateRoleUseCase {
  constructor(
    private readonly rolesRepository: RolesRepository,
    private readonly uuidService: UuidService,
  ) {}

  async execute(dto: CreateRoleDTO): Promise<RoleResponseDTO> {
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
    });

    return RoleResponseDTO.from(role);
  }
}
