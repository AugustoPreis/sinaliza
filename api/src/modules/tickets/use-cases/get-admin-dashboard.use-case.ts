import { HttpStatus, Injectable } from '@nestjs/common';

import { AppException } from '@shared/exceptions';

import { LocationsRepository } from '@modules/locations/repositories/locations.repository';
import { SectorEntity } from '@modules/sectors/entities/sector.entity';
import { SectorsRepository } from '@modules/sectors/repositories/sectors.repository';

import { AdminDashboardQueryDTO } from '../dtos/admin-dashboard-query.dto';
import { AdminDashboardResponseDTO } from '../dtos/admin-dashboard-response.dto';
import { IDashboardFilters, TicketsRepository } from '../repositories/tickets.repository';

// `GET /admin/dashboard` (endpoints-sinaliza.md §11.2) — Tela C.1.
@Injectable()
export class GetAdminDashboardUseCase {
  constructor(
    private readonly ticketsRepository: TicketsRepository,
    private readonly sectorsRepository: SectorsRepository,
    private readonly locationsRepository: LocationsRepository,
  ) {}

  async execute(query: AdminDashboardQueryDTO): Promise<AdminDashboardResponseDTO> {
    let sectorId: number | undefined;

    if (query.sector_id) {
      const sector = await this.sectorsRepository.findByUuid(query.sector_id);

      if (!sector) {
        throw AppException.from('sectors.errors.notFound', HttpStatus.NOT_FOUND, {
          args: { uuid: query.sector_id },
        });
      }

      sectorId = sector.id;
    }

    let buildingId: number | undefined;

    if (query.building_id) {
      const building = await this.locationsRepository.findBuildingByUuid(query.building_id);

      if (!building) {
        throw AppException.from('locations.errors.buildingNotFound', HttpStatus.NOT_FOUND, {
          args: { uuid: query.building_id },
        });
      }

      buildingId = building.id;
    }

    const filters: IDashboardFilters = {
      sectorId,
      statuses: query.status,
      from: query.from,
      to: query.to,
      buildingId,
    };

    const aggregates = await this.ticketsRepository.getDashboardAggregates(filters);
    const sectors = await this.sectorsRepository.findAll();
    const sectorById = new Map<number, SectorEntity>(sectors.map((sector) => [sector.id, sector]));

    return AdminDashboardResponseDTO.from(aggregates, sectorById);
  }
}
