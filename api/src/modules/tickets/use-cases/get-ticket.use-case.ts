import { HttpStatus, Injectable } from '@nestjs/common';

import { StorageService } from '@core/storage/storage.service';

import { ROLE_ADMIN } from '@shared/constants';
import { AppException } from '@shared/exceptions';


import { UsersRepository } from '@modules/users/repositories/users.repository';

import { TicketDetailResponseDTO } from '../dtos/ticket-detail-response.dto';
import { TicketsRepository } from '../repositories/tickets.repository';

// `GET /tickets/{ticketId}` (endpoints-sinaliza.md §8.3). Access control
// can't be a flat `@RequirePermission` here because it depends on the row
// itself (own ticket vs. sector history vs. admin), so it lives entirely in
// this use-case — see §19's "Ver próprios chamados"/"Ver fila de setor"
// rows and §21 point 8 (sector history visibility policy still open;
// `TicketsRepository.ticketBelongsToSectors` implements the simplest
// reading of it for now, refinable in Phase 4).
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

    // 403, not 404: unlike a lookup-by-uuid mismatch, the ticket
    // definitely exists — the caller is authenticated but not entitled to
    // it, which is exactly what `errors.forbidden` (also used by
    // `PermissionsGuard`) already models elsewhere in this project.
    if (!isAdmin && !isOwner && !isSectorAuthorized) {
      throw AppException.from('errors.forbidden', HttpStatus.FORBIDDEN);
    }

    // §19: "Ver observação interna" is a Setor/Admin-only row — never the
    // requester, even though the requester is `isOwner` here.
    const includeInternalNote = isAdmin || isSectorAuthorized;

    return TicketDetailResponseDTO.from(
      ticket,
      (storageKey) => this.storageService.publicUrl(storageKey),
      includeInternalNote,
    );
  }
}
