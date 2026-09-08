// endpoints-sinaliza.md §17 — immutable timeline entry types. `STATUS_CHANGED`
// and `REASSIGNED` are produced only from Phase 4 (sector/admin actions);
// this phase (ticket creation) only ever writes the first three.
export enum ETicketEventType {
  TICKET_OPENED = 'TICKET_OPENED',
  AUTO_CLASSIFIED = 'AUTO_CLASSIFIED',
  REQUESTER_CONFIRMED_SECTOR = 'REQUESTER_CONFIRMED_SECTOR',
  REQUESTER_CHANGED_SECTOR = 'REQUESTER_CHANGED_SECTOR',
  STATUS_CHANGED = 'STATUS_CHANGED',
  REASSIGNED = 'REASSIGNED',
  TICKET_RESOLVED = 'TICKET_RESOLVED',
}
