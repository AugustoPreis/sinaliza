import { AuditMetadataRegistry } from '../registry/audit-metadata.registry';

export interface IAuditEntityOptions {
  name?: string;
  /**
   * i18n namespace to look up this entity's audit labels in (matches a
   * NestJS module's own i18n file, e.g. `roles` for both `role` and
   * `permission`). Defaults to `name`; override it whenever a module audits
   * more than one entity.
   */
  module?: string;
  label?: string;
}

/**
 * Marks a class as audit-tracked and registers it in the `AuditMetadataRegistry`.
 * Executes no logic beyond recording metadata.
 */
export function AuditEntity(options?: IAuditEntityOptions): ClassDecorator {
  return (target) => {
    const name = options?.name ?? target.name;

    AuditMetadataRegistry.registerEntity(target, name, options?.module ?? name, options?.label);
  };
}
