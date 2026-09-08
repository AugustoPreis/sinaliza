// `PATCH /tickets/{ticketId}/status` (endpoints-sinaliza.md §10.2). A
// deliberately narrower enum than `ETicketStatus`: RB-10 forbids reopening
// and the doc's Tela B.3 only ever offers these two transitions from the
// outside — `OPEN`/`FORWARDED`/`RESOLVED` are never valid request bodies
// here, even though they're valid resting states of a ticket.
export enum ETicketStatusTransition {
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
}
