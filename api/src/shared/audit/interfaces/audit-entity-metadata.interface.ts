import { IAuditFieldMetadata } from './audit-field-metadata.interface';

/**
 * Any class constructor. Decorators genuinely need to key metadata off of a
 * bare function reference (a class decorator's `target`, or a property
 * decorator's `target.constructor`), so this intentionally widens to
 * `Function` rather than `Type<T>`, which would require a construct
 * signature TypeScript can't always infer at the decorator call site.
 */
// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export type AuditTarget = Function;

export interface IAuditEntityMetadata {
  target: AuditTarget;
  name: string;
  module: string;
  label?: string;
  fields: Map<string, IAuditFieldMetadata>;
}
