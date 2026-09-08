import { Injectable } from '@nestjs/common';

import { SectorSummaryDTO } from '../dtos/sector-summary.dto';
import { SectorsRepository } from '../repositories/sectors.repository';

// `GET /sectors` (endpoints-sinaliza.md §6.1) — the enxuto lookup any
// authenticated user (requester picking a sector on Tela A.4, sector staff
// reassigning on Tela B.3) can call, no `@RequirePermission` needed.
@Injectable()
export class ListSectorsUseCase {
  constructor(private readonly sectorsRepository: SectorsRepository) {}

  async execute(): Promise<{ items: SectorSummaryDTO[] }> {
    const sectors = await this.sectorsRepository.findAll();

    return { items: sectors.map((sector) => SectorSummaryDTO.from(sector)) };
  }
}
