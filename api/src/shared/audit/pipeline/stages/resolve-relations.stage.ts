import { Injectable, Type } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';

import {
  IAuditChangeSetContext,
  IAuditFieldWorkItem,
  IAuditRelationResolver,
} from '../../interfaces';

/**
 * First stage of the read-side pipeline: turns the raw `IFieldDiff[]` into
 * `IAuditFieldWorkItem[]` and, for fields with a `relationResolver`, resolves
 * the raw id/uuid into a richer value via `ModuleRef`.
 *
 * Resolution always degrades gracefully: if the resolver isn't registered, or
 * its `resolve()` call throws/rejects, the raw value is kept as-is so a
 * broken relation never breaks the audit trail.
 */
@Injectable()
export class ResolveRelationsStage {
  constructor(private readonly moduleRef: ModuleRef) {}

  async execute(context: IAuditChangeSetContext): Promise<IAuditChangeSetContext> {
    const items: IAuditFieldWorkItem[] = [];

    for (const change of context.changes) {
      const meta = context.metadata.fields.get(change.field) ?? { propertyName: change.field };
      const item: IAuditFieldWorkItem = {
        field: change.field,
        meta,
        rawOld: change.old,
        rawNew: change.new,
      };

      if (meta.relationResolver) {
        item.resolvedOld = await this.resolveSafely(meta.relationResolver, change.old);
        item.resolvedNew = await this.resolveSafely(meta.relationResolver, change.new);
      }

      items.push(item);
    }

    return { ...context, items };
  }

  private async resolveSafely(
    resolverType: Type<IAuditRelationResolver>,
    value: unknown,
  ): Promise<unknown> {
    if (value === null || value === undefined) {
      return value;
    }

    try {
      const resolver = this.moduleRef.get(resolverType, { strict: false });

      if (!resolver) {
        return value;
      }

      return await resolver.resolve(value);
    } catch {
      return value;
    }
  }
}
