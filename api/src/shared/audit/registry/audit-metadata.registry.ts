import { AuditTarget, IAuditEntityMetadata, IAuditFieldMetadata } from '../interfaces';

/**
 * Central, in-memory registry of audit metadata, populated directly by the
 * `@AuditEntity()` and `@Audit()` decorators. No other component in the audit
 * engine should read `Reflect` metadata directly; everything goes through here.
 *
 * Decorator evaluation order note: TypeScript evaluates property decorators
 * (bottom-up) before the class decorator. This registry tolerates either
 * order by lazily creating an entity record on first contact (keyed by the
 * class constructor) and reconciling its `name`/`label` whenever
 * `registerEntity` is later called.
 */
export class AuditMetadataRegistry {
  private static readonly byTarget = new Map<AuditTarget, IAuditEntityMetadata>();
  private static readonly byName = new Map<string, IAuditEntityMetadata>();

  static registerEntity(
    target: AuditTarget,
    name: string,
    module: string,
    label?: string,
  ): IAuditEntityMetadata {
    const metadata = this.getOrCreateEntity(target, name);

    if (metadata.name !== name) {
      this.byName.delete(metadata.name);
      metadata.name = name;
    }

    metadata.module = module;

    if (label !== undefined) {
      metadata.label = label;
    }

    this.byName.set(metadata.name, metadata);

    return metadata;
  }

  static registerField(target: AuditTarget, field: IAuditFieldMetadata): void {
    const metadata = this.getOrCreateEntity(target, target.name);

    metadata.fields.set(field.propertyName, field);
  }

  static getByTarget(target: AuditTarget): IAuditEntityMetadata | undefined {
    return this.byTarget.get(target);
  }

  static getByName(name: string): IAuditEntityMetadata | undefined {
    return this.byName.get(name);
  }

  static getAllNames(): string[] {
    return Array.from(this.byName.keys());
  }

  /**
   * Test-only helper: clears all registered metadata.
   */
  static clear(): void {
    this.byTarget.clear();
    this.byName.clear();
  }

  private static getOrCreateEntity(target: AuditTarget, defaultName: string): IAuditEntityMetadata {
    let metadata = this.byTarget.get(target);

    if (!metadata) {
      metadata = { target, name: defaultName, module: defaultName, fields: new Map() };
      this.byTarget.set(target, metadata);
      this.byName.set(defaultName, metadata);
    }

    return metadata;
  }
}
