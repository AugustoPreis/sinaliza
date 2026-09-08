import { Injectable } from '@nestjs/common';

import { SectorResponseDTO } from '../dtos/sector-response.dto';
import { SectorsRepository } from '../repositories/sectors.repository';

@Injectable()
export class ListAdminSectorsUseCase {
  constructor(private readonly sectorsRepository: SectorsRepository) {}

  async execute(search?: string): Promise<{ items: SectorResponseDTO[] }> {
    const sectors = await this.sectorsRepository.search(search);

    const responsibleUsersMap = await this.sectorsRepository.findResponsibleUsersBySectorIds(
      sectors.map((sector) => sector.id),
    );

    return {
      items: sectors.map((sector) =>
        SectorResponseDTO.from(sector, responsibleUsersMap.get(sector.id) ?? []),
      ),
    };
  }
}
