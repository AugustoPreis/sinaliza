import { Injectable } from '@nestjs/common';

import { UsersRepository } from '@modules/users/repositories/users.repository';

import { TicketListResponseDTO } from '../dtos/ticket-list-item-response.dto';
import { TicketQueryDTO } from '../dtos/ticket-query.dto';
import { TicketsRepository } from '../repositories/tickets.repository';

// `GET /tickets` (endpoints-sinaliza.md §8.2) — always scoped to "my own
// tickets" via the authenticated requester, never by permission-driven
// visibility (that's what makes it different from `/sector/tickets` or
// `/admin/tickets`, both Phase 4).
@Injectable()
export class ListMyTicketsUseCase {
  constructor(
    private readonly ticketsRepository: TicketsRepository,
    private readonly usersRepository: UsersRepository,
  ) {}

  async execute(currentUserUuid: string, query: TicketQueryDTO): Promise<TicketListResponseDTO> {
    const user = await this.usersRepository.findByUuid(currentUserUuid);

    if (!user) {
      return TicketListResponseDTO.from({
        data: [],
        meta: { total: 0, page: query.page, perPage: query.perPage, lastPage: 0 },
      });
    }

    const result = await this.ticketsRepository.findManyForRequester(
      user.id,
      { statuses: query.status, resolved: query.resolved },
      query.page,
      query.perPage,
    );

    return TicketListResponseDTO.from(result);
  }
}
