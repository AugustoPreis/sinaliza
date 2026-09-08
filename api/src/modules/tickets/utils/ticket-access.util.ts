import { HttpStatus } from '@nestjs/common';

import { ROLE_ADMIN, ROLE_SECTOR } from '@shared/constants';
import { AppException } from '@shared/exceptions';

import { UserEntity } from '@modules/users/entities/user.entity';

import { TicketEntity } from '../entities/ticket.entity';

// Shared by every Phase 4 sector/admin mutation (status, reassign, internal
// note): RB-08 says a sector only ever acts on the ticket wherever
// `current_sector_id` currently sits — history (automatic/confirmed sector,
// past REASSIGNED targets) matters for *read* access (`GetTicketUseCase`),
// not for these write actions, so this deliberately checks `currentSectorId`
// only.
export function isAdminUser(user: UserEntity): boolean {
  return user.userRoles.some((userRole) => userRole.role.name === ROLE_ADMIN);
}

// 403, not 404: the ticket exists, the caller is authenticated, they're just
// not entitled to act on it — same reasoning `GetTicketUseCase` already
// documents for `errors.forbidden`. Kept consistent across every Phase 4
// mutation so a sector probing another sector's ticket ids always gets the
// same signal.
export function assertSectorAuthorized(ticket: TicketEntity, user: UserEntity): void {
  if (isAdminUser(user)) return;

  const sectorIds = user.sectorUsers.map((sectorUser) => sectorUser.sectorId);

  if (!sectorIds.includes(ticket.currentSectorId)) {
    throw AppException.from('errors.forbidden', HttpStatus.FORBIDDEN);
  }
}

export function resolveActorRole(user: UserEntity): string {
  return isAdminUser(user) ? ROLE_ADMIN : ROLE_SECTOR;
}
