import { HttpStatus, Injectable } from '@nestjs/common';

import { AppException } from '@shared/exceptions';

import { LocationsRepository } from '@modules/locations/repositories/locations.repository';
import { SectorsRepository } from '@modules/sectors/repositories/sectors.repository';
import { UsersRepository } from '@modules/users/repositories/users.repository';

import { SectorTicketQueryDTO } from '../dtos/sector-ticket-query.dto';
import { SectorTicketListResponseDTO } from '../dtos/sector-ticket-response.dto';
import { ETicketStatus } from '../enums/ticket-status.enum';
import { ITicketQueueFilters, TicketsRepository } from '../repositories/tickets.repository';
import { isAdminUser } from '../utils/ticket-access.util';

// The active queue (no `status` filter given) never includes RESOLVED —
// that's what `/tickets/resolved` is for. A caller can still ask for
// RESOLVED explicitly (that's exactly how the resolved-tickets screen
// reuses this same endpoint), this only changes the *default*.
const DEFAULT_QUEUE_STATUSES = [ETicketStatus.FORWARDED, ETicketStatus.IN_PROGRESS];

// RB-08: a SECTOR user only ever sees the sectors in their own
// `sector_users` rows. ADMIN sees every sector by default, and may narrow
// down to one via `?sector_id`.
@Injectable()
export class ListSectorTicketsUseCase {
  constructor(
    private readonly ticketsRepository: TicketsRepository,
    private readonly usersRepository: UsersRepository,
    private readonly sectorsRepository: SectorsRepository,
    private readonly locationsRepository: LocationsRepository,
  ) {}

  async execute(
    currentUserUuid: string,
    query: SectorTicketQueryDTO,
  ): Promise<SectorTicketListResponseDTO> {
    const currentUser = await this.usersRepository.findByUuid(currentUserUuid);

    if (!currentUser) {
      throw AppException.from('users.errors.notFound', HttpStatus.NOT_FOUND);
    }

    const isAdmin = isAdminUser(currentUser);
    const ownSectorIds = currentUser.sectorUsers.map((sectorUser) => sectorUser.sectorId);

    // `null` = no restriction at all (admin, no `sector_id` filter given).
    let sectorIds: number[] | null = isAdmin ? null : ownSectorIds;

    if (query.sector_id) {
      const sector = await this.sectorsRepository.findByUuid(query.sector_id);

      if (!sector) {
        throw AppException.from('sectors.errors.notFound', HttpStatus.NOT_FOUND, {
          args: { uuid: query.sector_id },
        });
      }

      // RB-08: a non-admin asking for a sector outside their own set gets
      // denied outright, not silently scoped back to their own sectors —
      // otherwise a sector could probe which sector uuids exist by noticing
      // the response never errors.
      if (!isAdmin && !ownSectorIds.includes(sector.id)) {
        throw AppException.from('errors.forbidden', HttpStatus.FORBIDDEN);
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
      statuses: query.status?.length ? query.status : DEFAULT_QUEUE_STATUSES,
      from: query.from,
      to: query.to,
      buildingId,
      search: query.search,
    };

    const result = await this.ticketsRepository.findManyForQueue(
      sectorIds,
      filters,
      query.order.toUpperCase() as 'ASC' | 'DESC',
      query.page,
      query.perPage,
    );

    return SectorTicketListResponseDTO.from(result);
  }
}
