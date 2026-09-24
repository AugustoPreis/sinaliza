import { HttpStatus, Injectable } from '@nestjs/common';

import { StorageService } from '@core/storage/storage.service';

import { ROLE_ADMIN } from '@shared/constants';
import { AppException } from '@shared/exceptions';

import { UsersRepository } from '@modules/users/repositories/users.repository';

import { TicketDetailResponseDTO } from '../dtos/ticket-detail-response.dto';
import { TicketsRepository } from '../repositories/tickets.repository';

// Access control depends on the row (own ticket, sector history, admin), so
// it can't be a flat `@RequirePermission` - it lives entirely in this use-case.
@Injectable()
export class GetTicketUseCase {
  constructor(
    private readonly ticketsRepository: TicketsRepository,
    private readonly usersRepository: UsersRepository,
    private readonly storageService: StorageService,
  ) {}

  async execute(currentUserUuid: string, ticketUuid: string): Promise<TicketDetailResponseDTO> {
    const ticket = await this.ticketsRepository.findByUuidWithRelations(ticketUuid);

    if (!ticket) {
      throw AppException.from('tickets.errors.notFound', HttpStatus.NOT_FOUND);
    }

    const currentUser = await this.usersRepository.findByUuid(currentUserUuid);

    if (!currentUser) {
      throw AppException.from('tickets.errors.notFound', HttpStatus.NOT_FOUND);
    }

    const isAdmin = currentUser.userRoles.some((userRole) => userRole.role.name === ROLE_ADMIN);
    const isOwner = ticket.requesterId === currentUser.id;
    const sectorIds = currentUser.sectorUsers.map((sectorUser) => sectorUser.sectorId);
    const isSectorAuthorized = this.ticketsRepository.ticketBelongsToSectors(ticket, sectorIds);

    // 403, not 404: the ticket exists, the caller just isn't entitled to it.
    if (!isAdmin && !isOwner && !isSectorAuthorized) {
      throw AppException.from('errors.forbidden', HttpStatus.FORBIDDEN);
    }

    // Internal note is Setor/Admin-only - never the requester, even when
    // the requester is `isOwner`.
    const includeInternalNote = isAdmin || isSectorAuthorized;

    return TicketDetailResponseDTO.from(
      ticket,
      (storageKey) => this.storageService.publicUrl(storageKey),
      includeInternalNote,
    );
  }
}
