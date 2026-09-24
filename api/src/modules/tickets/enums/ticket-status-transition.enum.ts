// Deliberately narrower than `ETicketStatus`: RB-10 forbids reopening, so
// `OPEN`/`FORWARDED`/`RESOLVED` are never valid request bodies here, even
// though they're valid resting states of a ticket.
export enum ETicketStatusTransition {
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
}
