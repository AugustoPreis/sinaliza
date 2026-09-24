import { HttpStatus, Injectable } from '@nestjs/common';

import { AppException } from '@shared/exceptions';

import { LocationsRepository } from '@modules/locations/repositories/locations.repository';
import { SectorsRepository } from '@modules/sectors/repositories/sectors.repository';

import { AdminTicketQueryDTO } from '../dtos/admin-ticket-query.dto';
import { AdminTicketListResponseDTO } from '../dtos/admin-ticket-response.dto';
import { ITicketQueueFilters, TicketsRepository } from '../repositories/tickets.repository';

// No sector scoping - admin sees every sector by default. Defaults to
// newest-first, unlike RB-09's oldest-first queue ordering for
// `/sector/tickets`: this is an overview screen, not a work queue to clear.
@Injectable()
export class ListAdminTicketsUseCase {
  constructor(
    private readonly ticketsRepository: TicketsRepository,
    private readonly sectorsRepository: SectorsRepository,
    private readonly locationsRepository: LocationsRepository,
  ) {}

  async execute(query: AdminTicketQueryDTO): Promise<AdminTicketListResponseDTO> {
    let sectorIds: number[] | null = null;

    if (query.sector_id) {
      const sector = await this.sectorsRepository.findByUuid(query.sector_id);

      if (!sector) {
        throw AppException.from('sectors.errors.notFound', HttpStatus.NOT_FOUND, {
          args: { uuid: query.sector_id },
        });
      }

      sectorIds = [sector.id];
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

    const filters: ITicketQueueFilters = {
      statuses: query.status,
      from: query.from,
      to: query.to,
      buildingId,
      search: query.search,
    };

    const result = await this.ticketsRepository.findManyForQueue(
      sectorIds,
      filters,
      'DESC',
      query.page,
      query.perPage,
    );

    return AdminTicketListResponseDTO.from(result);
  }
}
