import { mockDeep } from 'jest-mock-extended';

import { StorageService } from '@core/storage/storage.service';

import { UsersRepository } from '@modules/users/repositories/users.repository';

import { TicketEntity } from '../../entities/ticket.entity';
import { TicketsRepository } from '../../repositories/tickets.repository';
import { GetTicketUseCase } from '../get-ticket.use-case';

describe('GetTicketUseCase', () => {
  const ticketsRepository = mockDeep<TicketsRepository>();
  const usersRepository = mockDeep<UsersRepository>();
  const storageService = mockDeep<StorageService>();

  const useCase = new GetTicketUseCase(ticketsRepository, usersRepository, storageService);

  const baseTicket = {
    uuid: 'tkt-1',
    protocol: 'SIN-1000',
    description: 'desc',
    requesterId: 1,
    building: { uuid: 'bld-1', name: 'Bloco A' },
    environment: { uuid: 'env-1', name: 'Sala 101' },
    automaticSector: { uuid: 'sec-ti', name: 'TI' },
    confirmedSector: { uuid: 'sec-ti', name: 'TI' },
    currentSector: { uuid: 'sec-ti', name: 'TI' },
    photos: [],
    events: [],
  } as unknown as TicketEntity;

  beforeEach(() => {
    jest.clearAllMocks();
    storageService.publicUrl.mockImplementation((key) => `https://files.example/${key}`);
  });

  it('throws not found when the ticket does not exist', async () => {
    ticketsRepository.findByUuidWithRelations.mockResolvedValue(null);

    await expect(useCase.execute('usr-1', 'missing')).rejects.toMatchObject({
      i18nKey: 'tickets.errors.notFound',
    });
  });

  it('allows the owning requester', async () => {
    ticketsRepository.findByUuidWithRelations.mockResolvedValue(baseTicket);
    usersRepository.findByUuid.mockResolvedValue({
      id: 1,
      userRoles: [],
      sectorUsers: [],
    } as never);

    const result = await useCase.execute('usr-1', 'tkt-1');

    expect(result.id).toBe('tkt-1');
  });

  it('denies a requester who does not own the ticket', async () => {
    ticketsRepository.findByUuidWithRelations.mockResolvedValue(baseTicket);
    usersRepository.findByUuid.mockResolvedValue({
      id: 2,
      userRoles: [],
      sectorUsers: [],
    } as never);
    ticketsRepository.ticketBelongsToSectors.mockReturnValue(false);

    await expect(useCase.execute('usr-2', 'tkt-1')).rejects.toMatchObject({
      i18nKey: 'errors.forbidden',
    });
  });

  it('allows an admin regardless of ownership/sector', async () => {
    ticketsRepository.findByUuidWithRelations.mockResolvedValue(baseTicket);
    usersRepository.findByUuid.mockResolvedValue({
      id: 999,
      userRoles: [{ role: { name: 'ADMIN' } }],
      sectorUsers: [],
    } as never);
    ticketsRepository.ticketBelongsToSectors.mockReturnValue(false);

    await expect(useCase.execute('usr-admin', 'tkt-1')).resolves.toBeDefined();
  });

  it('allows sector staff whose sectors relate to the ticket', async () => {
    ticketsRepository.findByUuidWithRelations.mockResolvedValue(baseTicket);
    usersRepository.findByUuid.mockResolvedValue({
      id: 999,
      userRoles: [],
      sectorUsers: [{ sectorId: 10 }],
    } as never);
    ticketsRepository.ticketBelongsToSectors.mockReturnValue(true);

    await expect(useCase.execute('usr-sector', 'tkt-1')).resolves.toBeDefined();
    expect(ticketsRepository.ticketBelongsToSectors).toHaveBeenCalledWith(baseTicket, [10]);
  });
});
