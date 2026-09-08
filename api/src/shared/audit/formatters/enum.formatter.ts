import { Injectable } from '@nestjs/common';

import { IAuditFormatContext, IAuditFormatter } from '../interfaces';
import { I18nAuditTranslator } from '../translators/i18n-audit.translator';
import { stringifyUnknown } from '../utils/stringify.util';

@Injectable()
export class EnumFormatter implements IAuditFormatter {
  constructor(private readonly translator: I18nAuditTranslator) {}

  format(value: unknown, context: IAuditFormatContext): string {
    if (value === null || value === undefined) {
      return '';
    }

    return this.translator.translateEnum(
      context.module,
      context.entityName,
      context.field,
      stringifyUnknown(value),
      context.locale,
    );
  }
}
