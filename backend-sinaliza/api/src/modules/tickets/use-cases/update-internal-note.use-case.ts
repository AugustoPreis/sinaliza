import { HttpStatus, Injectable } from '@nestjs/common';

import { AppException } from '@shared/exceptions';

import { UsersRepository } from '@modules/users/repositories/users.repository';

import { UpdateInternalNoteResponseDTO } from '../dtos/update-internal-note-response.dto';
import { UpdateInternalNoteDTO } from '../dtos/update-internal-note.dto';
import { TicketsRepository } from '../repositories/tickets.repository';
import { assertSectorAuthorized } from '../utils/ticket-access.util';

// Deliberately does NOT append a `TicketEventEntity` row and does NOT call
// `NotificationsRepository`: this is sector/admin-only bookkeeping, never a
// fact about the ticket's lifecycle that the requester's timeline or push
// notifications are meant to surface.
@Injectable()
export class UpdateInternalNoteUseCase {
  constructor(
    private readonly ticketsRepository: TicketsRepository,
    private readonly usersRepository: UsersRepository,
  ) {}

  async execute(
    currentUserUuid: string,
    ticketUuid: string,
    dto: UpdateInternalNoteDTO,
  ): Promise<UpdateInternalNoteResponseDTO> {
    const ticket = await this.ticketsRepository.findByUuid(ticketUuid);

    if (!ticket) {
      throw AppException.from('tickets.errors.notFound', HttpStatus.NOT_FOUND);
    }

    const currentUser = await this.usersRepository.findByUuid(currentUserUuid);

    if (!currentUser) {
      throw AppException.from('users.errors.notFound', HttpStatus.NOT_FOUND);
    }

    assertSectorAuthorized(ticket, currentUser);

    const updated = await this.ticketsRepository.updateInternalNote(ticket.id, dto.internal_note);

    return UpdateInternalNoteResponseDTO.from(updated);
  }
}
