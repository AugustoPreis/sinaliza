import { HttpStatus, Injectable } from '@nestjs/common';

import { AppException } from '@shared/exceptions';

import { UserEntity } from '@modules/users/entities/user.entity';

import { SectorMutationResponseDTO } from '../dtos/sector-mutation-response.dto';
import { UpdateSectorDTO } from '../dtos/update-sector.dto';
import { SectorsRepository } from '../repositories/sectors.repository';

@Injectable()
export class UpdateSectorUseCase {
  constructor(private readonly sectorsRepository: SectorsRepository) {}

  async execute(uuid: string, dto: UpdateSectorDTO): Promise<SectorMutationResponseDTO> {
    const sector = await this.sectorsRepository.findByUuid(uuid);

    if (!sector) {
      throw AppException.from('sectors.errors.notFound', HttpStatus.NOT_FOUND);
    }

    const updated = await this.sectorsRepository.update(sector.id, {
      name: dto.name,
      categories: dto.categories,
    });

    const responsibleUserUuids = await this.updateResponsibleUsersIfRequested(sector.id, dto);

    return SectorMutationResponseDTO.from(updated, responsibleUserUuids);
  }

  private async updateResponsibleUsersIfRequested(
    sectorId: number,
    dto: UpdateSectorDTO,
  ): Promise<string[]> {
    if (dto.responsible_user_ids === undefined) {
      const current = await this.sectorsRepository.findResponsibleUsers(sectorId);

      return current.map((user) => user.uuid);
    }

    const users = await this.resolveResponsibleUsers(dto.responsible_user_ids);

    await this.sectorsRepository.setResponsibleUsers(
      sectorId,
      users.map((user) => user.id),
    );

    return users.map((user) => user.uuid);
  }

  private async resolveResponsibleUsers(uuids: string[]): Promise<UserEntity[]> {
    if (!uuids.length) return [];

    const users = await this.sectorsRepository.findUsersByUuids(uuids);

    if (users.length !== new Set(uuids).size) {
      const found = new Set(users.map((user) => user.uuid));
      const missing = uuids.filter((id) => !found.has(id));

      throw AppException.from('users.errors.notFound', HttpStatus.NOT_FOUND, {
        args: { uuid: missing.join(', ') },
      });
    }

    return users;
  }
}
