import { HttpStatus, Injectable } from '@nestjs/common';

import { AppException } from '@shared/exceptions';
import { UuidService } from '@shared/services/uuid.service';

import { UserEntity } from '@modules/users/entities/user.entity';

import { CreateSectorDTO } from '../dtos/create-sector.dto';
import { SectorMutationResponseDTO } from '../dtos/sector-mutation-response.dto';
import { SectorsRepository } from '../repositories/sectors.repository';

// `POST /admin/sectors` (endpoints-sinaliza.md §12.2) — Tela C.2.
@Injectable()
export class CreateSectorUseCase {
  constructor(
    private readonly sectorsRepository: SectorsRepository,
    private readonly uuidService: UuidService,
  ) {}

  async execute(dto: CreateSectorDTO): Promise<SectorMutationResponseDTO> {
    const responsibleUserUuids = dto.responsible_user_ids ?? [];
    const responsibleUsers = await this.resolveResponsibleUsers(responsibleUserUuids);

    const sector = await this.sectorsRepository.create({
      uuid: this.uuidService.generate(),
      name: dto.name,
      categories: dto.categories,
    });

    if (responsibleUsers.length) {
      await this.sectorsRepository.setResponsibleUsers(
        sector.id,
        responsibleUsers.map((user) => user.id),
      );
    }

    return SectorMutationResponseDTO.from(sector, responsibleUserUuids);
  }

  private async resolveResponsibleUsers(uuids: string[]): Promise<UserEntity[]> {
    if (!uuids.length) return [];

    const users = await this.sectorsRepository.findUsersByUuids(uuids);

    if (users.length !== new Set(uuids).size) {
      const found = new Set(users.map((user) => user.uuid));
      const missing = uuids.filter((uuid) => !found.has(uuid));

      throw AppException.from('users.errors.notFound', HttpStatus.NOT_FOUND, {
        args: { uuid: missing.join(', ') },
      });
    }

    return users;
  }
}
