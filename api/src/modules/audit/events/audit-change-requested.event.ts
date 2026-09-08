import { EAuditAction } from '../enums/audit-action.enum';

export const AUDIT_CHANGE_REQUESTED_EVENT = 'audit.change.requested';

/**
 * Event emitted whenever some part of the application wants a change
 * audited. Mirrors `IAuditPipelineInput` (`@shared/audit`) so it can be
 * handed off to `AuditPipelineService.recordChange` unchanged.
 *
 * Emitted by `AuditSubscriber` for every `@AuditEntity()`-decorated entity.
 */
export interface IAuditChangeRequestedEvent {
  entityName: string;
  entityUuid: string;
  actorUuid: string | null;
  action: EAuditAction;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
}
