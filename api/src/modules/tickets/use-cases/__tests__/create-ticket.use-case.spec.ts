import { mockDeep } from 'jest-mock-extended';

import { StorageService } from '@core/storage/storage.service';

import { LocationsRepository } from '@modules/locations/repositories/locations.repository';
import { SectorsRepository } from '@modules/sectors/repositories/sectors.repository';
import { UsersRepository } from '@modules/users/repositories/users.repository';

import { CreateTicketDTO } from '../../dtos/create-ticket.dto';
import { TicketEntity } from '../../entities/ticket.entity';
import { ETicketEventType } from '../../enums/ticket-event-type.enum';
import { ETicketStatus } from '../../enums/ticket-status.enum';
import { TicketsRepository } from '../../repositories/tickets.repository';
import { CreateTicketUseCase } from '../create-ticket.use-case';

describe('CreateTicketUseCase', () => {
  const ticketsRepository = mockDeep<TicketsRepository>();
  const sectorsRepository = mockDeep<SectorsRepository>();
  const locationsRepository = mockDeep<LocationsRepository>();
  const usersRepository = mockDeep<UsersRepository>();
  const storageService = mockDeep<StorageService>();

  const useCase = new CreateTicketUseCase(
    ticketsRepository,
    sectorsRepository,
    locationsRepository,
    usersRepository,
    storageService,
    { generate: () => 'generated-uuid' },
  );

  const dto: CreateTicketDTO = {
    description: 'O projetor da sala não está ligando',
    location: { building_id: 'bld-1', environment_id: 'env-1' },
    automatic_sector_id: 'sec-ti',
    confirmed_sector_id: 'sec-ti',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    usersRepository.findByUuid.mockResolvedValue({ id: 1, uuid: 'usr-1' } as never);
    sectorsRepository.findByUuid.mockImplementation((uuid) =>
      Promise.resolve({ id: uuid === 'sec-ti' ? 10 : 20, uuid, name: uuid } as never),
    );
    locationsRepository.findBuildingByUuid.mockResolvedValue({ id: 100, uuid: 'bld-1' } as never);
    locationsRepository.findEnvironmentByUuid.mockResolvedValue({
      id: 200,
      uuid: 'env-1',
      buildingId: 100,
    } as never);
    ticketsRepository.nextProtocol.mockResolvedValue('SIN-1000');
    ticketsRepository.createWithInitialEvents.mockImplementation((data) =>
      Promise.resolve({ ...data, createdAt: new Date('2026-08-20T14:30:00Z') } as TicketEntity),
    );
  });

  it('creates a ticket already FORWARDED with requesterCorrected=false when sectors match', async () => {
    const result = await useCase.execute('usr-1', dto, []);

    expect(ticketsRepository.createWithInitialEvents).toHaveBeenCalled();
    const [ticketData, , events] = ticketsRepository.createWithInitialEvents.mock.calls[0];

    expect(ticketData).toMatchObject({
      requesterId: 1,
      automaticSectorId: 10,
      confirmedSectorId: 10,
      currentSectorId: 10,
      requesterCorrected: false,
      status: ETicketStatus.FORWARDED,
    });
    expect(events.map((event) => event.type)).toEqual([
      ETicketEventType.TICKET_OPENED,
      ETicketEventType.AUTO_CLASSIFIED,
      ETicketEventType.REQUESTER_CONFIRMED_SECTOR,
    ]);
    expect(result.status).toBe(ETicketStatus.FORWARDED);
    expect(result.protocol).toBe('SIN-1000');
  });

  it('marks requesterCorrected=true and emits REQUESTER_CHANGED_SECTOR when sectors diverge', async () => {
    await useCase.execute('usr-1', { ...dto, confirmed_sector_id: 'sec-manutencao' }, []);

    const [ticketData, , events] = ticketsRepository.createWithInitialEvents.mock.calls[0];

    expect(ticketData.requesterCorrected).toBe(true);
    expect(ticketData.confirmedSectorId).toBe(20);
    expect(ticketData.currentSectorId).toBe(20);
    expect(events[2].type).toBe(ETicketEventType.REQUESTER_CHANGED_SECTOR);
  });

  it('uploads each photo under a unique key scoped to the ticket uuid', async () => {
    storageService.upload.mockResolvedValue('irrelevant');

    const photos = [
      { buffer: Buffer.from('a'), mimetype: 'image/jpeg' },
      { buffer: Buffer.from('b'), mimetype: 'image/png' },
    ] as Express.Multer.File[];

    await useCase.execute('usr-1', dto, photos);

    expect(storageService.upload).toHaveBeenCalledTimes(2);
    const [firstKey] = storageService.upload.mock.calls[0];
    const [secondKey] = storageService.upload.mock.calls[1];

    expect(firstKey).not.toEqual(secondKey);
    expect(firstKey).toContain('tickets/generated-uuid/');
  });

  it('throws when the automatic sector does not exist', async () => {
    sectorsRepository.findByUuid.mockResolvedValueOnce(null);

    await expect(useCase.execute('usr-1', dto, [])).rejects.toMatchObject({
      i18nKey: 'sectors.errors.notFound',
    });
  });

  it('throws when the environment does not belong to the given building', async () => {
    locationsRepository.findEnvironmentByUuid.mockResolvedValue({
      id: 200,
      uuid: 'env-1',
      buildingId: 999,
    } as never);

    await expect(useCase.execute('usr-1', dto, [])).rejects.toMatchObject({
      i18nKey: 'locations.errors.environmentNotFound',
    });
  });

  it('throws when the requester does not exist', async () => {
    usersRepository.findByUuid.mockResolvedValue(null);

    await expect(useCase.execute('usr-1', dto, [])).rejects.toMatchObject({
      i18nKey: 'users.errors.notFound',
    });
  });
});
