import { mockDeep } from 'jest-mock-extended';

import { ENotificationType } from '@modules/notifications/enums/notification-type.enum';
import { NotificationsRepository } from '@modules/notifications/repositories/notifications.repository';
import { UsersRepository } from '@modules/users/repositories/users.repository';

import { UpdateTicketStatusDTO } from '../../dtos/update-ticket-status.dto';
import { TicketEntity } from '../../entities/ticket.entity';
import { ETicketEventType } from '../../enums/ticket-event-type.enum';
import { ETicketStatusTransition } from '../../enums/ticket-status-transition.enum';
import { ETicketStatus } from '../../enums/ticket-status.enum';
import { TicketsRepository } from '../../repositories/tickets.repository';
import { UpdateTicketStatusUseCase } from '../update-ticket-status.use-case';

describe('UpdateTicketStatusUseCase', () => {
  const ticketsRepository = mockDeep<TicketsRepository>();
  const usersRepository = mockDeep<UsersRepository>();
  const notificationsRepository = mockDeep<NotificationsRepository>();

  const useCase = new UpdateTicketStatusUseCase(ticketsRepository, usersRepository, notificationsRepository, {
    generate: () => 'generated-uuid',
  });

  const sectorUser = { id: 5, userRoles: [], sectorUsers: [{ sectorId: 10 }] } as never;

  const baseTicket = {
    id: 1,
    uuid: 'tkt-1',
    protocol: 'SIN-1000',
    requesterId: 42,
    status: ETicketStatus.FORWARDED,
    currentSectorId: 10,
    createdAt: new Date('2026-08-20T14:00:00Z'),
    events: [
      {
        type: ETicketEventType.REQUESTER_CONFIRMED_SECTOR,
        toSectorId: 10,
        createdAt: new Date('2026-08-20T14:00:00Z'),
      },
    ],
  } as unknown as TicketEntity;

  beforeEach(() => {
    jest.clearAllMocks();
    ticketsRepository.findByUuidWithRelations.mockResolvedValue(baseTicket);
    ticketsRepository.updateWithEvent.mockImplementation((_id, updates) =>
      Promise.resolve({ ...baseTicket, ...updates, updatedAt: new Date('2026-08-20T15:00:00Z') }),
    );
  });

  it('moves a ticket to IN_PROGRESS, appends a STATUS_CHANGED event and notifies the requester', async () => {
    usersRepository.findByUuid.mockResolvedValue(sectorUser);

    const dto: UpdateTicketStatusDTO = { status: ETicketStatusTransition.IN_PROGRESS };
    const result = await useCase.execute('usr-sector', 'tkt-1', dto);

    const [ticketId, updates, event] = ticketsRepository.updateWithEvent.mock.calls[0];
    expect(ticketId).toBe(1);
    expect(updates).toMatchObject({ status: ETicketStatus.IN_PROGRESS });
    expect(updates.resolvedAt).toBeUndefined();
    expect(event).toMatchObject({
      type: ETicketEventType.STATUS_CHANGED,
      fromStatus: ETicketStatus.FORWARDED,
      toStatus: ETicketStatus.IN_PROGRESS,
    });
    expect(notificationsRepository.create).toHaveBeenCalledWith(
      42,
      1,
      ENotificationType.TICKET_STATUS_CHANGED,
      expect.any(String),
    );
    expect(result.status).toBe(ETicketStatus.IN_PROGRESS);
  });

  it('resolves a ticket, computing correctSectorReachedAt from the timeline and notifying with TICKET_RESOLVED', async () => {
    usersRepository.findByUuid.mockResolvedValue(sectorUser);

    const dto: UpdateTicketStatusDTO = { status: ETicketStatusTransition.RESOLVED };
    await useCase.execute('usr-sector', 'tkt-1', dto);

    const [, updates] = ticketsRepository.updateWithEvent.mock.calls[0];
    expect(updates.resolvedBySectorId).toBe(10);
    expect(updates.resolvedAt).toBeInstanceOf(Date);
    expect(updates.correctSectorReachedAt).toEqual(new Date('2026-08-20T14:00:00Z'));
    expect(notificationsRepository.create).toHaveBeenCalledWith(
      42,
      1,
      ENotificationType.TICKET_RESOLVED,
      expect.any(String),
    );
  });

  it('uses the most recent REASSIGNED event landing on the current sector for correctSectorReachedAt', async () => {
    usersRepository.findByUuid.mockResolvedValue(sectorUser);
    ticketsRepository.findByUuidWithRelations.mockResolvedValue({
      ...baseTicket,
      events: [
        {
          type: ETicketEventType.REQUESTER_CONFIRMED_SECTOR,
          toSectorId: 99,
          createdAt: new Date('2026-08-20T14:00:00Z'),
        },
        {
          type: ETicketEventType.REASSIGNED,
          toSectorId: 10,
          createdAt: new Date('2026-08-20T14:30:00Z'),
        },
        {
          type: ETicketEventType.REASSIGNED,
          toSectorId: 10,
          createdAt: new Date('2026-08-20T15:00:00Z'),
        },
      ],
    } as unknown as TicketEntity);

    await useCase.execute('usr-sector', 'tkt-1', { status: ETicketStatusTransition.RESOLVED });

    const [, updates] = ticketsRepository.updateWithEvent.mock.calls[0];
    expect(updates.correctSectorReachedAt).toEqual(new Date('2026-08-20T15:00:00Z'));
  });

  it('rejects a sector user acting on a ticket outside their sectors', async () => {
    usersRepository.findByUuid.mockResolvedValue({
      id: 5,
      userRoles: [],
      sectorUsers: [{ sectorId: 999 }],
    } as never);

    await expect(
      useCase.execute('usr-sector', 'tkt-1', { status: ETicketStatusTransition.IN_PROGRESS }),
    ).rejects.toMatchObject({ i18nKey: 'errors.forbidden' });
  });

  it('rejects any transition once the ticket is already RESOLVED (RB-10)', async () => {
    usersRepository.findByUuid.mockResolvedValue(sectorUser);
    ticketsRepository.findByUuidWithRelations.mockResolvedValue({
      ...baseTicket,
      status: ETicketStatus.RESOLVED,
    });

    await expect(
      useCase.execute('usr-sector', 'tkt-1', { status: ETicketStatusTransition.IN_PROGRESS }),
    ).rejects.toMatchObject({ i18nKey: 'tickets.errors.alreadyResolved' });
  });

  it('throws when the ticket does not exist', async () => {
    ticketsRepository.findByUuidWithRelations.mockResolvedValue(null);

    await expect(
      useCase.execute('usr-sector', 'missing', { status: ETicketStatusTransition.IN_PROGRESS }),
    ).rejects.toMatchObject({ i18nKey: 'tickets.errors.notFound' });
  });
});
