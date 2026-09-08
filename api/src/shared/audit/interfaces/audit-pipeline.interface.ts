import { IFieldDiff } from './audit-diff.interface';
import { IAuditEntityMetadata } from './audit-entity-metadata.interface';
import { IAuditFieldMetadata } from './audit-field-metadata.interface';

/**
 * Payload accepted by `AuditPipelineService.recordChange`. Mirrors the shape of
 * `IAuditChangeRequestedEvent` (`@modules/audit`) so the event listener can pass
 * it through untouched.
 */
export interface IAuditPipelineInput {
  entityName: string;
  entityUuid: string;
  actorUuid: string | null;
  action: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
}

/**
 * Context threaded through the write-side pipeline stages:
 * LoadMetadata -> Normalize -> Diff.
 */
export interface IAuditRecordContext {
  input: IAuditPipelineInput;
  metadata?: IAuditEntityMetadata;
  normalizedBefore?: Record<string, unknown>;
  normalizedAfter?: Record<string, unknown>;
  diffs?: IFieldDiff[];
}

/**
 * Per-field working state used while assembling a change set for display.
 */
export interface IAuditFieldWorkItem {
  field: string;
  meta: IAuditFieldMetadata;
  rawOld: unknown;
  rawNew: unknown;
  resolvedOld?: unknown;
  resolvedNew?: unknown;
  label?: string;
  formattedOld?: string;
  formattedNew?: string;
}

/**
 * Context threaded through the read-side pipeline stages:
 * ResolveRelations -> Translate -> Format -> BuildDto.
 */
export interface IAuditChangeSetContext {
  entityName: string;
  metadata: IAuditEntityMetadata;
  locale: string;
  changes: IFieldDiff[];
  items?: IAuditFieldWorkItem[];
}
