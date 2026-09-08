import { mockDeep } from 'jest-mock-extended';

import { LocationsRepository } from '@modules/locations/repositories/locations.repository';
import { SectorsRepository } from '@modules/sectors/repositories/sectors.repository';
import { UsersRepository } from '@modules/users/repositories/users.repository';

import { SectorTicketQueryDTO } from '../../dtos/sector-ticket-query.dto';
import { TicketsRepository } from '../../repositories/tickets.repository';
import { ListSectorTicketsUseCase } from '../list-sector-tickets.use-case';

describe('ListSectorTicketsUseCase', () => {
  const ticketsRepository = mockDeep<TicketsRepository>();
  const usersRepository = mockDeep<UsersRepository>();
  const sectorsRepository = mockDeep<SectorsRepository>();
  const locationsRepository = mockDeep<LocationsRepository>();

  const useCase = new ListSectorTicketsUseCase(
    ticketsRepository,
    usersRepository,
    sectorsRepository,
    locationsRepository,
  );

  const query = Object.assign(new SectorTicketQueryDTO(), { page: 1, perPage: 20, order: 'asc' as const });

  const emptyResult = { data: [], meta: { total: 0, page: 1, perPage: 20, lastPage: 0 } };

  beforeEach(() => {
    jest.clearAllMocks();
    ticketsRepository.findManyForQueue.mockResolvedValue(emptyResult);
  });

  it('scopes a sector user to their own sector ids (RB-08)', async () => {
    usersRepository.findByUuid.mockResolvedValue({
      id: 1,
      userRoles: [],
      sectorUsers: [{ sectorId: 10 }, { sectorId: 20 }],
    } as never);

    await useCase.execute('usr-sector', query);

    expect(ticketsRepository.findManyForQueue).toHaveBeenCalledWith(
      [10, 20],
      expect.any(Object),
      'ASC',
      1,
      20,
    );
  });

  it('lets an admin see every sector (no restriction) when no sector_id filter is given', async () => {
    usersRepository.findByUuid.mockResolvedValue({
      id: 2,
      userRoles: [{ role: { name: 'ADMIN' } }],
      sectorUsers: [],
    } as never);

    await useCase.execute('usr-admin', query);

    expect(ticketsRepository.findManyForQueue).toHaveBeenCalledWith(null, expect.any(Object), 'ASC', 1, 20);
  });

  it('denies a sector user filtering by a sector_id outside their own set', async () => {
    usersRepository.findByUuid.mockResolvedValue({
      id: 1,
      userRoles: [],
      sectorUsers: [{ sectorId: 10 }],
    } as never);
    sectorsRepository.findByUuid.mockResolvedValue({ id: 99, uuid: 'sec-other', name: 'Outro' } as never);

    await expect(
      useCase.execute('usr-sector', { ...query, sector_id: 'sec-other' }),
    ).rejects.toMatchObject({ i18nKey: 'errors.forbidden' });

    expect(ticketsRepository.findManyForQueue).not.toHaveBeenCalled();
  });

  it('narrows an admin down to one sector via sector_id', async () => {
    usersRepository.findByUuid.mockResolvedValue({
      id: 2,
      userRoles: [{ role: { name: 'ADMIN' } }],
      sectorUsers: [],
    } as never);
    sectorsRepository.findByUuid.mockResolvedValue({ id: 10, uuid: 'sec-ti', name: 'TI' } as never);

    await useCase.execute('usr-admin', { ...query, sector_id: 'sec-ti' });

    expect(ticketsRepository.findManyForQueue).toHaveBeenCalledWith([10], expect.any(Object), 'ASC', 1, 20);
  });

  it('throws when the current user cannot be resolved', async () => {
    usersRepository.findByUuid.mockResolvedValue(null);

    await expect(useCase.execute('missing', query)).rejects.toMatchObject({
      i18nKey: 'users.errors.notFound',
    });
  });
});
