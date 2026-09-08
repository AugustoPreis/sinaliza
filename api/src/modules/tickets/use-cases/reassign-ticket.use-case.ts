import { HttpStatus, Injectable } from '@nestjs/common';

import { AppException } from '@shared/exceptions';
import { UuidService } from '@shared/services/uuid.service';

import { ENotificationType } from '@modules/notifications/enums/notification-type.enum';
import { NotificationsRepository } from '@modules/notifications/repositories/notifications.repository';
import { SectorsRepository } from '@modules/sectors/repositories/sectors.repository';
import { UsersRepository } from '@modules/users/repositories/users.repository';

import { ReassignTicketResponseDTO } from '../dtos/reassign-ticket-response.dto';
import { ReassignTicketDTO } from '../dtos/reassign-ticket.dto';
import { TicketEventEntity } from '../entities/ticket-event.entity';
import { TicketEntity } from '../entities/ticket.entity';
import { ETicketEventType } from '../enums/ticket-event-type.enum';
import { ETicketStatus } from '../enums/ticket-status.enum';
import { TicketsRepository } from '../repositories/tickets.repository';
import { assertSectorAuthorized, resolveActorRole } from '../utils/ticket-access.util';

// `reason` is validated as required at the DTO layer (RB-07); everything
// else (RB-05/RB-06) happens here.
@Injectable()
export class ReassignTicketUseCase {
  constructor(
    private readonly ticketsRepository: TicketsRepository,
    private readonly usersRepository: UsersRepository,
    private readonly sectorsRepository: SectorsRepository,
    private readonly notificationsRepository: NotificationsRepository,
    private readonly uuidService: UuidService,
  ) {}

  async execute(
    currentUserUuid: string,
    ticketUuid: string,
    dto: ReassignTicketDTO,
  ): Promise<ReassignTicketResponseDTO> {
    const ticket = await this.ticketsRepository.findByUuidWithRelations(ticketUuid);

    if (!ticket) {
      throw AppException.from('tickets.errors.notFound', HttpStatus.NOT_FOUND);
    }

    const currentUser = await this.usersRepository.findByUuid(currentUserUuid);

    if (!currentUser) {
      throw AppException.from('users.errors.notFound', HttpStatus.NOT_FOUND);
    }

    assertSectorAuthorized(ticket, currentUser);

    // RB-10's "no reopening" spirit extends here too: a resolved ticket is
    // done, it doesn't get pulled back into anyone's queue.
    if (ticket.status === ETicketStatus.RESOLVED) {
      throw AppException.from('tickets.errors.alreadyResolved', HttpStatus.CONFLICT);
    }

    const targetSector = await this.sectorsRepository.findByUuid(dto.target_sector_id);

    if (!targetSector) {
      throw AppException.from('sectors.errors.notFound', HttpStatus.NOT_FOUND, {
        args: { uuid: dto.target_sector_id },
      });
    }

    if (targetSector.id === ticket.currentSectorId) {
      throw AppException.from('tickets.errors.reassignSameSector', HttpStatus.BAD_REQUEST);
    }

    const previousSector = ticket.currentSector;
    const reclassifiedAt = new Date();

    const updates: Partial<TicketEntity> = {
      currentSectorId: targetSector.id,
      status: ETicketStatus.FORWARDED,
      sectorReclassified: true,
    };

    const event: Partial<TicketEventEntity> = {
      uuid: this.uuidService.generate(),
      type: ETicketEventType.REASSIGNED,
      actorUserId: currentUser.id,
      actorRole: resolveActorRole(currentUser),
      fromSectorId: ticket.currentSectorId,
      toSectorId: targetSector.id,
      reason: dto.reason,
    };

    const updated = await this.ticketsRepository.updateWithEvent(ticket.id, updates, event);

    // RB-14's notification duty extends to reassignment too.
    await this.notificationsRepository.create(
      ticket.requesterId,
      ticket.id,
      ENotificationType.TICKET_REASSIGNED,
      `Seu chamado ${ticket.protocol} foi redirecionado para ${targetSector.name}.`,
    );

    return ReassignTicketResponseDTO.from(updated, previousSector, targetSector, reclassifiedAt);
  }
}
