import { HttpStatus, Injectable } from '@nestjs/common';

import { AppException } from '@shared/exceptions';
import { UuidService } from '@shared/services/uuid.service';

import { ENotificationType } from '@modules/notifications/enums/notification-type.enum';
import { NotificationsRepository } from '@modules/notifications/repositories/notifications.repository';
import { UsersRepository } from '@modules/users/repositories/users.repository';

import { UpdateTicketStatusResponseDTO } from '../dtos/update-ticket-status-response.dto';
import { UpdateTicketStatusDTO } from '../dtos/update-ticket-status.dto';
import { TicketEventEntity } from '../entities/ticket-event.entity';
import { TicketEntity } from '../entities/ticket.entity';
import { ETicketEventType } from '../enums/ticket-event-type.enum';
import { ETicketStatusTransition } from '../enums/ticket-status-transition.enum';
import { ETicketStatus } from '../enums/ticket-status.enum';
import { TicketsRepository } from '../repositories/tickets.repository';
import { assertSectorAuthorized, resolveActorRole } from '../utils/ticket-access.util';

// Only `IN_PROGRESS`/`RESOLVED` come in from the DTO (RB-10: no reopening);
// this use-case additionally refuses the transition once a ticket is
// already `RESOLVED`.
@Injectable()
export class UpdateTicketStatusUseCase {
  constructor(
    private readonly ticketsRepository: TicketsRepository,
    private readonly usersRepository: UsersRepository,
    private readonly notificationsRepository: NotificationsRepository,
    private readonly uuidService: UuidService,
  ) {}

  async execute(
    currentUserUuid: string,
    ticketUuid: string,
    dto: UpdateTicketStatusDTO,
  ): Promise<UpdateTicketStatusResponseDTO> {
    const ticket = await this.ticketsRepository.findByUuidWithRelations(ticketUuid);

    if (!ticket) {
      throw AppException.from('tickets.errors.notFound', HttpStatus.NOT_FOUND);
    }

    const currentUser = await this.usersRepository.findByUuid(currentUserUuid);

    if (!currentUser) {
      throw AppException.from('users.errors.notFound', HttpStatus.NOT_FOUND);
    }

    assertSectorAuthorized(ticket, currentUser);

    if (ticket.status === ETicketStatus.RESOLVED) {
      throw AppException.from('tickets.errors.alreadyResolved', HttpStatus.CONFLICT);
    }

    const toStatus =
      dto.status === ETicketStatusTransition.RESOLVED
        ? ETicketStatus.RESOLVED
        : ETicketStatus.IN_PROGRESS;

    const updates: Partial<TicketEntity> = { status: toStatus };
    const event: Partial<TicketEventEntity> = {
      uuid: this.uuidService.generate(),
      type: ETicketEventType.STATUS_CHANGED,
      actorUserId: currentUser.id,
      actorRole: resolveActorRole(currentUser),
      fromStatus: ticket.status,
      toStatus,
    };

    if (toStatus === ETicketStatus.RESOLVED) {
      updates.resolvedBySectorId = ticket.currentSectorId;
      updates.resolvedAt = new Date();
      updates.correctSectorReachedAt = this.resolveCorrectSectorReachedAt(ticket);
    }

    const updated = await this.ticketsRepository.updateWithEvent(ticket.id, updates, event);

    // RB-14: both transitions notify the requester, only the type differs.
    await this.notificationsRepository.create(
      ticket.requesterId,
      ticket.id,
      toStatus === ETicketStatus.RESOLVED
        ? ENotificationType.TICKET_RESOLVED
        : ENotificationType.TICKET_STATUS_CHANGED,
      this.buildMessage(ticket.protocol, toStatus),
    );

    return UpdateTicketStatusResponseDTO.from(updated);
  }

  // Finds the timeline event that last moved the ticket into its *current*
  // sector - the most recent `REASSIGNED` event landing there if the ticket
  // was ever reassigned, otherwise the original confirmation event from
  // creation. Its `createdAt` feeds `average_time_to_correct_sector_minutes`.
  private resolveCorrectSectorReachedAt(ticket: TicketEntity): Date {
    const relevantTypes = new Set([
      ETicketEventType.REQUESTER_CONFIRMED_SECTOR,
      ETicketEventType.REQUESTER_CHANGED_SECTOR,
      ETicketEventType.REASSIGNED,
    ]);

    const candidates = (ticket.events ?? [])
      .filter(
        (event) => relevantTypes.has(event.type) && event.toSectorId === ticket.currentSectorId,
      )
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    return candidates.length ? candidates[candidates.length - 1].createdAt : ticket.createdAt;
  }

  private buildMessage(protocol: string, status: ETicketStatus): string {
    return status === ETicketStatus.RESOLVED
      ? `Seu chamado ${protocol} foi resolvido.`
      : `Seu chamado ${protocol} está em andamento.`;
  }
}
