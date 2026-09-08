import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AppException } from '@shared/exceptions';
import { HashService } from '@shared/services/hash.service';
import { UuidService } from '@shared/services/uuid.service';

import { RoleEntity } from '@modules/roles/entities/role.entity';

import { CreateUserDTO } from '../dtos/create-user.dto';
import { UserResponseDTO } from '../dtos/user-response.dto';
import { EUserStatus } from '../enums/user-status.enum';
import { UsersRepository } from '../repositories/users.repository';

@Injectable()
export class CreateUserUseCase {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly hashService: HashService,
    private readonly uuidService: UuidService,
    @InjectRepository(RoleEntity)
    private readonly roleRepo: Repository<RoleEntity>,
  ) {}

  async execute(dto: CreateUserDTO): Promise<UserResponseDTO> {
    const email = dto.email.toLowerCase();

    const existing = await this.usersRepository.findByEmail(email);

    if (existing) {
      throw AppException.from('users.errors.emailTaken', HttpStatus.CONFLICT, { args: { email } });
    }

    const roleIds = await this.resolveRoleIds(dto.roleUuids);
    const passwordHash = await this.hashService.hash(dto.password);

    const user = await this.usersRepository.create({
      uuid: this.uuidService.generate(),
      email,
      name: dto.name,
      institutionalId: dto.institutionalId ?? null,
      institutionalLink: dto.institutionalLink ?? null,
      passwordHash,
      status: EUserStatus.ACTIVE,
    });

    if (roleIds) {
      await this.usersRepository.setRoles(user.id, roleIds);
    }

    const created = roleIds ? await this.usersRepository.findByUuid(user.uuid) : user;

    return UserResponseDTO.from(created!);
  }

  private async resolveRoleIds(roleUuids?: string[]): Promise<number[] | undefined> {
    if (!roleUuids) return undefined;

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
