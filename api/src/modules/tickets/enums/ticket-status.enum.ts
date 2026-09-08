// `RECLASSIFIED` is deliberately NOT a member here (RB-06): reclassification
// is a timeline event (`ETicketEventType.REASSIGNED`), never a persisted status.
export enum ETicketStatus {
  OPEN = 'OPEN',
  FORWARDED = 'FORWARDED',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
}
