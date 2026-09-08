import { Injectable } from '@nestjs/common';

import { BuildingResponseDTO } from '../dtos/location-response.dto';
import { LocationsRepository } from '../repositories/locations.repository';

// `GET /locations` (endpoints-sinaliza.md §5.1) — feeds the guided
// prédio → ambiente picker on Tela A.3 and portal location filters.
@Injectable()
export class ListLocationsUseCase {
  constructor(private readonly locationsRepository: LocationsRepository) {}

  async execute(buildingId?: string): Promise<{ buildings: BuildingResponseDTO[] }> {
    const buildings = await this.locationsRepository.findAllWithEnvironments(buildingId);

    return { buildings: buildings.map((building) => BuildingResponseDTO.from(building)) };
  }
}
