import { Injectable } from '@nestjs/common';

import { BuildingResponseDTO } from '../dtos/location-response.dto';
import { LocationsRepository } from '../repositories/locations.repository';

@Injectable()
export class ListLocationsUseCase {
  constructor(private readonly locationsRepository: LocationsRepository) {}

  async execute(buildingId?: string): Promise<{ buildings: BuildingResponseDTO[] }> {
    const buildings = await this.locationsRepository.findAllWithEnvironments(buildingId);

    return { buildings: buildings.map((building) => BuildingResponseDTO.from(building)) };
  }
}
