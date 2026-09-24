import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, In } from 'typeorm';

import { AppException } from '@shared/exceptions';

import { RoleEntity } from '@modules/roles/entities/role.entity';
import { SectorEntity } from '@modules/sectors/entities/sector.entity';

import { UpdateUserPermissionsResponseDTO } from '../dtos/update-user-permissions-response.dto';
import { UpdateUserPermissionsDTO } from '../dtos/update-user-permissions.dto';
import { SectorUserEntity } from '../entities/sector-user.entity';
import { UserRoleEntity } from '../entities/user-role.entity';
import { UsersRepository } from '../repositories/users.repository';

// Roles and sector assignments are edited together and written in a single
// transaction. Roles are resolved by `name`; sectors by `uuid`.
@Injectable()
export class UpdateUserPermissionsUseCase {
  constructor(
    private readonly usersRepository: UsersRepository,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async execute(
    uuid: string,
    dto: UpdateUserPermissionsDTO,
  ): Promise<UpdateUserPermissionsResponseDTO> {
    const user = await this.usersRepository.findByUuid(uuid);

    if (!user) {
      throw AppException.from('users.errors.notFound', HttpStatus.NOT_FOUND);
    }

    const roles = await this.resolveRoles(dto.roles);
    const sectors = await this.resolveSectors(dto.sector_ids);

    await this.dataSource.transaction(async (manager) => {
      const userRoleRepo = manager.getRepository(UserRoleEntity);
      const sectorUserRepo = manager.getRepository(SectorUserEntity);

      await userRoleRepo.delete({ userId: user.id });
      if (roles.length) {
        await userRoleRepo.save(
          roles.map((role) => userRoleRepo.create({ userId: user.id, roleId: role.id })),
        );
      }

      await sectorUserRepo.delete({ userId: user.id });
      if (sectors.length) {
        await sectorUserRepo.save(
          sectors.map((sector) => sectorUserRepo.create({ userId: user.id, sectorId: sector.id })),
        );
      }
    });

    const response = new UpdateUserPermissionsResponseDTO();

    response.id = user.uuid;
    response.roles = roles.map((role) => role.name);
    response.sector_ids = sectors.map((sector) => sector.uuid);

    return response;
  }

  private async resolveRoles(names: string[]): Promise<RoleEntity[]> {
    if (!names.length) return [];

    const roles = await this.dataSource
      .getRepository(RoleEntity)
      .find({ where: { name: In(names) } });

    if (roles.length !== new Set(names).size) {
      const found = new Set(roles.map((role) => role.name));
      const missing = names.filter((name) => !found.has(name));

      throw AppException.from('roles.errors.notFound', HttpStatus.NOT_FOUND, {
        args: { name: missing.join(', ') },
      });
    }

    return roles;
  }

  private async resolveSectors(uuids: string[]): Promise<SectorEntity[]> {
    if (!uuids.length) return [];

    const sectors = await this.dataSource
      .getRepository(SectorEntity)
      .find({ where: { uuid: In(uuids) } });

    if (sectors.length !== new Set(uuids).size) {
      const found = new Set(sectors.map((sector) => sector.uuid));
      const missing = uuids.filter((id) => !found.has(id));

      throw AppException.from('sectors.errors.notFound', HttpStatus.NOT_FOUND, {
        args: { uuid: missing.join(', ') },
      });
    }

    return sectors;
  }
}
