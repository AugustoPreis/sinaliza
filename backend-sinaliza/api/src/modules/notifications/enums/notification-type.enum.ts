// Mirrors `ETicketEventType` 1:1 for the events that actually notify the
// requester, so the two enums stay easy to reason about side by side.
export enum ENotificationType {
  TICKET_STATUS_CHANGED = 'TICKET_STATUS_CHANGED',
  TICKET_REASSIGNED = 'TICKET_REASSIGNED',
  TICKET_RESOLVED = 'TICKET_RESOLVED',
}
