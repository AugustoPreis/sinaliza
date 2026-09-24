import { HttpStatus } from '@nestjs/common';

import { ROLE_ADMIN, ROLE_SECTOR } from '@shared/constants';
import { AppException } from '@shared/exceptions';

import { UserEntity } from '@modules/users/entities/user.entity';

import { TicketEntity } from '../entities/ticket.entity';

export function isAdminUser(user: UserEntity): boolean {
  return user.userRoles.some((userRole) => userRole.role.name === ROLE_ADMIN);
}

// RB-08: a sector only ever acts on the ticket wherever `current_sector_id`
// currently sits - history (past sectors/REASSIGNED targets) only matters
// for read access, not for these write actions. 403, not 404: the ticket
// exists, the caller just isn't entitled to act on it.
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
