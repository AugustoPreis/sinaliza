import { mockDeep } from 'jest-mock-extended';

import { UsersRepository } from '@modules/users/repositories/users.repository';

import { UpdateInternalNoteDTO } from '../../dtos/update-internal-note.dto';
import { TicketEntity } from '../../entities/ticket.entity';
import { TicketsRepository } from '../../repositories/tickets.repository';
import { UpdateInternalNoteUseCase } from '../update-internal-note.use-case';

describe('UpdateInternalNoteUseCase', () => {
  const ticketsRepository = mockDeep<TicketsRepository>();
  const usersRepository = mockDeep<UsersRepository>();

  const useCase = new UpdateInternalNoteUseCase(ticketsRepository, usersRepository);

  const sectorUser = { id: 5, userRoles: [], sectorUsers: [{ sectorId: 10 }] } as never;
  const baseTicket = { id: 1, uuid: 'tkt-1', currentSectorId: 10 } as TicketEntity;

  beforeEach(() => {
    jest.clearAllMocks();
    ticketsRepository.findByUuid.mockResolvedValue(baseTicket);
    usersRepository.findByUuid.mockResolvedValue(sectorUser);
  });

  it('updates the internal note without touching the timeline or notifications', async () => {
    ticketsRepository.updateInternalNote.mockResolvedValue({
      ...baseTicket,
      internalNote: 'Foi solicitado teste do equipamento antes da troca.',
      updatedAt: new Date('2026-08-20T15:25:00Z'),
    });

    const dto: UpdateInternalNoteDTO = { internal_note: 'Foi solicitado teste do equipamento antes da troca.' };
    const result = await useCase.execute('usr-sector', 'tkt-1', dto);

    expect(ticketsRepository.updateInternalNote).toHaveBeenCalledWith(1, dto.internal_note);
    expect(result).toEqual({ success: true, updated_at: new Date('2026-08-20T15:25:00Z') });
  });

  it('rejects a sector user acting on a ticket outside their sectors', async () => {
    usersRepository.findByUuid.mockResolvedValue({
      id: 5,
      userRoles: [],
      sectorUsers: [{ sectorId: 999 }],
    } as never);

    await expect(
      useCase.execute('usr-sector', 'tkt-1', { internal_note: 'nota' }),
    ).rejects.toMatchObject({ i18nKey: 'errors.forbidden' });
    expect(ticketsRepository.updateInternalNote).not.toHaveBeenCalled();
  });

  it('throws when the ticket does not exist', async () => {
    ticketsRepository.findByUuid.mockResolvedValue(null);

    await expect(
      useCase.execute('usr-sector', 'missing', { internal_note: 'nota' }),
    ).rejects.toMatchObject({ i18nKey: 'tickets.errors.notFound' });
  });
});
