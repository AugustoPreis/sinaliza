import { mockDeep } from 'jest-mock-extended';

import { ENotificationType } from '@modules/notifications/enums/notification-type.enum';
import { NotificationsRepository } from '@modules/notifications/repositories/notifications.repository';
import { SectorsRepository } from '@modules/sectors/repositories/sectors.repository';
import { UsersRepository } from '@modules/users/repositories/users.repository';

import { ReassignTicketDTO } from '../../dtos/reassign-ticket.dto';
import { TicketEntity } from '../../entities/ticket.entity';
import { ETicketEventType } from '../../enums/ticket-event-type.enum';
import { ETicketStatus } from '../../enums/ticket-status.enum';
import { TicketsRepository } from '../../repositories/tickets.repository';
import { ReassignTicketUseCase } from '../reassign-ticket.use-case';

describe('ReassignTicketUseCase', () => {
  const ticketsRepository = mockDeep<TicketsRepository>();
  const usersRepository = mockDeep<UsersRepository>();
  const sectorsRepository = mockDeep<SectorsRepository>();
  const notificationsRepository = mockDeep<NotificationsRepository>();

  const useCase = new ReassignTicketUseCase(
    ticketsRepository,
    usersRepository,
    sectorsRepository,
    notificationsRepository,
    { generate: () => 'generated-uuid' },
  );

  const sectorUser = { id: 5, userRoles: [], sectorUsers: [{ sectorId: 10 }] } as never;

  const baseTicket = {
    id: 1,
    uuid: 'tkt-1',
    protocol: 'SIN-1000',
    requesterId: 42,
    status: ETicketStatus.FORWARDED,
    currentSectorId: 10,
    currentSector: { id: 10, uuid: 'sec-ti', name: 'TI' },
  } as unknown as TicketEntity;

  const dto: ReassignTicketDTO = {
    target_sector_id: 'sec-manutencao',
    reason: 'O defeito é elétrico/predial e não de equipamento de TI.',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    ticketsRepository.findByUuidWithRelations.mockResolvedValue(baseTicket);
    usersRepository.findByUuid.mockResolvedValue(sectorUser);
    sectorsRepository.findByUuid.mockResolvedValue({
      id: 20,
      uuid: 'sec-manutencao',
      name: 'Manutenção Predial',
    } as never);
    ticketsRepository.updateWithEvent.mockImplementation((_id, updates) =>
      Promise.resolve({ ...baseTicket, ...updates }),
    );
  });

  it('moves current_sector_id, resets status to FORWARDED and flags sectorReclassified', async () => {
    await useCase.execute('usr-sector', 'tkt-1', dto);

    const [ticketId, updates, event] = ticketsRepository.updateWithEvent.mock.calls[0];
    expect(ticketId).toBe(1);
    expect(updates).toMatchObject({
      currentSectorId: 20,
      status: ETicketStatus.FORWARDED,
      sectorReclassified: true,
    });
    expect(event).toMatchObject({
      type: ETicketEventType.REASSIGNED,
      fromSectorId: 10,
      toSectorId: 20,
      reason: dto.reason,
    });
  });

  it('notifies the requester with TICKET_REASSIGNED', async () => {
    await useCase.execute('usr-sector', 'tkt-1', dto);

    expect(notificationsRepository.create).toHaveBeenCalledWith(
      42,
      1,
      ENotificationType.TICKET_REASSIGNED,
      expect.any(String),
    );
  });

  it('returns previous_sector/current_sector/reclassified_at in the documented shape', async () => {
    const result = await useCase.execute('usr-sector', 'tkt-1', dto);

    expect(result.previous_sector).toEqual({ id: 'sec-ti', name: 'TI' });
    expect(result.current_sector).toEqual({ id: 'sec-manutencao', name: 'Manutenção Predial' });
    expect(result.reclassified_at).toBeInstanceOf(Date);
  });

  it('rejects when target_sector_id equals the current sector', async () => {
    sectorsRepository.findByUuid.mockResolvedValue({ id: 10, uuid: 'sec-ti', name: 'TI' } as never);

    await expect(
      useCase.execute('usr-sector', 'tkt-1', { ...dto, target_sector_id: 'sec-ti' }),
    ).rejects.toMatchObject({ i18nKey: 'tickets.errors.reassignSameSector' });
  });

  it('rejects a sector user acting on a ticket outside their sectors (RB-08)', async () => {
    usersRepository.findByUuid.mockResolvedValue({
      id: 5,
      userRoles: [],
      sectorUsers: [{ sectorId: 999 }],
    } as never);

    await expect(useCase.execute('usr-sector', 'tkt-1', dto)).rejects.toMatchObject({
      i18nKey: 'errors.forbidden',
    });
  });

  it('rejects reassigning an already RESOLVED ticket', async () => {
    ticketsRepository.findByUuidWithRelations.mockResolvedValue({
      ...baseTicket,
      status: ETicketStatus.RESOLVED,
    });

    await expect(useCase.execute('usr-sector', 'tkt-1', dto)).rejects.toMatchObject({
      i18nKey: 'tickets.errors.alreadyResolved',
    });
  });

  it('throws when the target sector does not exist', async () => {
    sectorsRepository.findByUuid.mockResolvedValue(null);

    await expect(useCase.execute('usr-sector', 'tkt-1', dto)).rejects.toMatchObject({
      i18nKey: 'sectors.errors.notFound',
    });
  });
});
