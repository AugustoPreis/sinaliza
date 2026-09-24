import { mockDeep } from 'jest-mock-extended';

import { UsersRepository } from '@modules/users/repositories/users.repository';

import { TicketQueryDTO } from '../../dtos/ticket-query.dto';
import { TicketEntity } from '../../entities/ticket.entity';
import { ETicketStatus } from '../../enums/ticket-status.enum';
import { TicketsRepository } from '../../repositories/tickets.repository';
import { ListMyTicketsUseCase } from '../list-my-tickets.use-case';

describe('ListMyTicketsUseCase', () => {
  const ticketsRepository = mockDeep<TicketsRepository>();
  const usersRepository = mockDeep<UsersRepository>();
  const useCase = new ListMyTicketsUseCase(ticketsRepository, usersRepository);

  const query: TicketQueryDTO = Object.assign(new TicketQueryDTO(), { page: 1, perPage: 20 });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('scopes the listing to the resolved requester id, never trusting a client-provided one', async () => {
    usersRepository.findByUuid.mockResolvedValue({ id: 42, uuid: 'usr-1' } as never);
    ticketsRepository.findManyForRequester.mockResolvedValue({
      data: [],
      meta: { total: 0, page: 1, perPage: 20, lastPage: 0 },
    });

    await useCase.execute('usr-1', query);

    expect(ticketsRepository.findManyForRequester).toHaveBeenCalledWith(
      42,
      { statuses: undefined, resolved: undefined },
      1,
      20,
    );
  });

  it('maps entities into the documented items/page/page_size/total shape', async () => {
    usersRepository.findByUuid.mockResolvedValue({ id: 42, uuid: 'usr-1' } as never);
    ticketsRepository.findManyForRequester.mockResolvedValue({
      data: [
        {
          uuid: 'tkt-1',
          protocol: 'SIN-1000',
          description: 'O projetor da sala não está ligando',
          status: ETicketStatus.FORWARDED,
          currentSector: { uuid: 'sec-ti', name: 'TI' },
          createdAt: new Date('2026-08-20T14:30:00Z'),
        } as unknown as TicketEntity,
      ],
      meta: { total: 1, page: 1, perPage: 20, lastPage: 1 },
    });

    const result = await useCase.execute('usr-1', query);

    expect(result).toEqual({
      items: [
        {
          id: 'tkt-1',
          protocol: 'SIN-1000',
          description_summary: 'O projetor da sala não está ligando',
          current_sector: { id: 'sec-ti', name: 'TI' },
          status: ETicketStatus.FORWARDED,
          created_at: new Date('2026-08-20T14:30:00Z'),
        },
      ],
      page: 1,
      page_size: 20,
      total: 1,
    });
  });

  it('returns an empty page without querying tickets when the user cannot be resolved', async () => {
    usersRepository.findByUuid.mockResolvedValue(null);

    const result = await useCase.execute('missing-uuid', query);

    expect(ticketsRepository.findManyForRequester).not.toHaveBeenCalled();
    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
  });
});
