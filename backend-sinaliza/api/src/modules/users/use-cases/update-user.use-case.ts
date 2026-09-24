import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AppException } from '@shared/exceptions';

import { RoleEntity } from '@modules/roles/entities/role.entity';

import { UpdateUserDTO } from '../dtos/update-user.dto';
import { UserResponseDTO } from '../dtos/user-response.dto';
import { UsersRepository } from '../repositories/users.repository';

@Injectable()
export class UpdateUserUseCase {
  constructor(
    private readonly usersRepository: UsersRepository,
    @InjectRepository(RoleEntity)
    private readonly roleRepo: Repository<RoleEntity>,
  ) {}

  async execute(uuid: string, dto: UpdateUserDTO): Promise<UserResponseDTO> {
    const user = await this.usersRepository.findByUuid(uuid);

    if (!user) {
      throw AppException.from('users.errors.notFound', HttpStatus.NOT_FOUND);
    }

    if (dto.email && dto.email.toLowerCase() !== user.email) {
      const existing = await this.usersRepository.findByEmail(dto.email.toLowerCase());

      if (existing) {
        throw AppException.from('users.errors.emailTaken', HttpStatus.CONFLICT, {
          args: { email: dto.email },
        });
      }
    }

    // Omitted `roleUuids` leaves the user's roles untouched; provided (even
    // empty) replaces the full set, same semantics as PUT /users/:uuid/roles.
    if (dto.roleUuids) {
      const roleIds = await this.resolveRoleIds(dto.roleUuids);

      await this.usersRepository.setRoles(user.id, roleIds);
    }

    const updated = await this.usersRepository.update(user.id, {
      email: dto.email?.toLowerCase(),
      name: dto.name,
      institutionalId: dto.institutionalId,
      institutionalLink: dto.institutionalLink,
    });

    return UserResponseDTO.from(updated);
  }

  private async resolveRoleIds(roleUuids: string[]): Promise<number[]> {
    const roles = await Promise.all(
      roleUuids.map(async (roleUuid) => {
        const role = await this.roleRepo.findOne({ where: { uuid: roleUuid } });

        if (!role) {
          throw AppException.from('roles.errors.notFound', HttpStatus.NOT_FOUND, {
            args: { uuid: roleUuid },
          });
        }

        return role;
      }),
    );

    return roles.map((role) => role.id);
  }
}
