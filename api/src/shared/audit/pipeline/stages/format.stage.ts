import { Injectable, Type } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';

import { DefaultFormatter } from '../../formatters/default.formatter';
import { RelationFormatter } from '../../formatters/relation.formatter';
import {
  IAuditChangeSetContext,
  IAuditFieldWorkItem,
  IAuditFormatContext,
  IAuditFormatter,
} from '../../interfaces';

/**
 * Third stage of the read-side pipeline: turns each field's (possibly
 * relation-resolved) old/new value into its final display string.
 *
 * Formatter resolution order:
 * 1. The field's explicit `formatter` (custom, resolved via `ModuleRef`).
 * 2. `RelationFormatter`, when the field has a `relationResolver`.
 * 3. `DefaultFormatter` otherwise.
 */
@Injectable()
export class FormatStage {
  constructor(
    private readonly moduleRef: ModuleRef,
    private readonly defaultFormatter: DefaultFormatter,
    private readonly relationFormatter: RelationFormatter,
  ) {}

  async execute(context: IAuditChangeSetContext): Promise<IAuditChangeSetContext> {
    const items = context.items ?? [];

    for (const item of items) {
      const formatter = this.resolveFormatter(item);
      const formatContext: IAuditFormatContext = {
        module: context.metadata.module,
        entityName: context.entityName,
        field: item.field,
        locale: context.locale,
      };

      const oldValue = item.meta.relationResolver ? item.resolvedOld : item.rawOld;
      const newValue = item.meta.relationResolver ? item.resolvedNew : item.rawNew;

      item.formattedOld = await this.formatValue(formatter, oldValue, formatContext);
      item.formattedNew = await this.formatValue(formatter, newValue, formatContext);
    }

    return { ...context, items };
  }

  private async formatValue(
    formatter: IAuditFormatter,
    value: unknown,
    context: IAuditFormatContext,
  ): Promise<string> {
    if (value === null || value === undefined) {
      return '';
    }

    return formatter.format(value, context);
  }

  private resolveFormatter(item: IAuditFieldWorkItem): IAuditFormatter {
    if (item.meta.formatter) {
      const resolved = this.resolveCustomFormatter(item.meta.formatter);

      if (resolved) {
        return resolved;
      }
    }

    if (item.meta.relationResolver) {
      return this.relationFormatter;
    }

    return this.defaultFormatter;
  }

  private resolveCustomFormatter(
    formatterType: Type<IAuditFormatter>,
  ): IAuditFormatter | undefined {
    return this.moduleRef.get(formatterType, { strict: false }) ?? undefined;
  }
}
