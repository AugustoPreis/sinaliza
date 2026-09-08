import { Injectable } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';

import { IAuditFormatContext, IAuditFormatter } from '../interfaces';

@Injectable()
export class BooleanFormatter implements IAuditFormatter {
  constructor(private readonly i18n: I18nService) {}

  format(value: unknown, context: IAuditFormatContext): string {
    if (value === null || value === undefined) {
      return '';
    }

    const isTrue = Boolean(value);
    const key = isTrue ? 'common.yes' : 'common.no';

    return this.i18n.translate(key, {
      lang: context.locale,
      defaultValue: isTrue.toString(),
    });
  }
}
