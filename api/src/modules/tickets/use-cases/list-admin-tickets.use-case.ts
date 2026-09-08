import { HttpStatus, Injectable } from '@nestjs/common';

import { AppException } from '@shared/exceptions';

import { LocationsRepository } from '@modules/locations/repositories/locations.repository';
import { SectorsRepository } from '@modules/sectors/repositories/sectors.repository';

import { AdminTicketQueryDTO } from '../dtos/admin-ticket-query.dto';
import { AdminTicketListResponseDTO } from '../dtos/admin-ticket-response.dto';
import { ITicketQueueFilters, TicketsRepository } from '../repositories/tickets.repository';

// `GET /admin/tickets` (endpoints-sinaliza.md §11.1). No sector scoping
// (admin sees every sector by default, §19's "Ver fila de setor: Admin ✅").
// Ordering isn't documented for this listing the way RB-09 fixes it for
// `/sector/tickets`, so this defaults to newest-first — the natural read for
// an administration overview screen, not a work queue to clear oldest-first.
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
