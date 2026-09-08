import { Injectable } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';

import { IAuditTranslator } from '../interfaces';

/**
 * Translates entity/field/enum labels for the audit engine using the
 * `I18nService` directly (never `I18nContext.current()`), so it also works
 * from contexts with no active HTTP request (e.g. a future TypeORM
 * subscriber emitting audit events outside a request lifecycle).
 *
 * Labels live per-module, not in a central catalog: each NestJS module owns
 * an `<module>.audit.json` locale file (merged by `nestjs-i18n` into that
 * module's existing namespace), nesting every audited entity under
 * `audit.entities.<entityName>` so a module can audit more than one entity
 * (e.g. `roles` auditing both `role` and `permission`).
 */
@Injectable()
export class I18nAuditTranslator implements IAuditTranslator {
  constructor(private readonly i18n: I18nService) {}

  translateEntity(module: string, entityName: string, locale: string, fallback?: string): string {
    return this.i18n.translate(`${module}.audit.entities.${entityName}.label`, {
      lang: locale,
      defaultValue: fallback ?? entityName,
    });
  }

  translateField(
    module: string,
    entityName: string,
    field: string,
    locale: string,
    fallback?: string,
  ): string {
    return this.i18n.translate(`${module}.audit.entities.${entityName}.fields.${field}`, {
      lang: locale,
      defaultValue: fallback ?? field,
    });
  }

  translateEnum(
    module: string,
    entityName: string,
    field: string,
    value: string,
    locale: string,
    fallback?: string,
  ): string {
    return this.i18n.translate(`${module}.audit.entities.${entityName}.enums.${field}.${value}`, {
      lang: locale,
      defaultValue: fallback ?? value,
    });
  }
}
