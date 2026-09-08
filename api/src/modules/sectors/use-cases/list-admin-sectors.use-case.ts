import { Injectable } from '@nestjs/common';

import { SectorResponseDTO } from '../dtos/sector-response.dto';
import { SectorsRepository } from '../repositories/sectors.repository';

// `GET /admin/sectors` (endpoints-sinaliza.md §12.1) — Tela C.2, full shape
// with categories and responsible users, optionally filtered by `?search=`.
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
