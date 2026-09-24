import { Injectable } from '@nestjs/common';

import { SectorSummaryDTO } from '../dtos/sector-summary.dto';
import { SectorsRepository } from '../repositories/sectors.repository';

@Injectable()
export class ListSectorsUseCase {
  constructor(private readonly sectorsRepository: SectorsRepository) {}

  async execute(): Promise<{ items: SectorSummaryDTO[] }> {
    const sectors = await this.sectorsRepository.findAll();

    return { items: sectors.map((sector) => SectorSummaryDTO.from(sector)) };
  }
}
