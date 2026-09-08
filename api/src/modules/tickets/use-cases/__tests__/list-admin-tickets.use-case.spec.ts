import { mockDeep } from 'jest-mock-extended';

import { LocationsRepository } from '@modules/locations/repositories/locations.repository';
import { SectorsRepository } from '@modules/sectors/repositories/sectors.repository';

import { AdminTicketQueryDTO } from '../../dtos/admin-ticket-query.dto';
import { TicketsRepository } from '../../repositories/tickets.repository';
import { ListAdminTicketsUseCase } from '../list-admin-tickets.use-case';

describe('ListAdminTicketsUseCase', () => {
  const ticketsRepository = mockDeep<TicketsRepository>();
  const sectorsRepository = mockDeep<SectorsRepository>();
  const locationsRepository = mockDeep<LocationsRepository>();

  const useCase = new ListAdminTicketsUseCase(
    ticketsRepository,
    sectorsRepository,
    locationsRepository,
  );

  const query = Object.assign(new AdminTicketQueryDTO(), { page: 1, perPage: 20 });
  const emptyResult = { data: [], meta: { total: 0, page: 1, perPage: 20, lastPage: 0 } };

  beforeEach(() => {
    jest.clearAllMocks();
    ticketsRepository.findManyForQueue.mockResolvedValue(emptyResult);
  });

  it('lists every sector by default (no restriction) ordered newest-first', async () => {
    await useCase.execute(query);

    expect(ticketsRepository.findManyForQueue).toHaveBeenCalledWith(
      null,
      expect.any(Object),
      'DESC',
      1,
      20,
    );
  });

  it('scopes to one sector when sector_id is given', async () => {
    sectorsRepository.findByUuid.mockResolvedValue({ id: 10, uuid: 'sec-ti', name: 'TI' } as never);

    await useCase.execute({ ...query, sector_id: 'sec-ti' });

    expect(ticketsRepository.findManyForQueue).toHaveBeenCalledWith(
      [10],
      expect.any(Object),
      'DESC',
      1,
      20,
    );
  });

  it('throws when the given sector_id does not exist', async () => {
    sectorsRepository.findByUuid.mockResolvedValue(null);

    await expect(useCase.execute({ ...query, sector_id: 'missing' })).rejects.toMatchObject({
      i18nKey: 'sectors.errors.notFound',
    });
  });

  it('throws when the given building_id does not exist', async () => {
    locationsRepository.findBuildingByUuid.mockResolvedValue(null);

    await expect(useCase.execute({ ...query, building_id: 'missing' })).rejects.toMatchObject({
      i18nKey: 'locations.errors.buildingNotFound',
    });
  });
});
