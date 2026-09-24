import { Injectable } from '@nestjs/common';

import { IAuditFormatContext, IAuditFormatter } from '../interfaces';
import { stringifyUnknown } from '../utils/stringify.util';

@Injectable()
export class DateFormatter implements IAuditFormatter {
  private readonly formatters = new Map<string, Intl.DateTimeFormat>();

  format(value: unknown, context: IAuditFormatContext): string {
    if (value === null || value === undefined || value === '') {
      return '';
    }

    const date = value instanceof Date ? value : new Date(value as string | number);

    if (Number.isNaN(date.getTime())) {
      return stringifyUnknown(value);
    }

    return this.getFormatter(context.locale).format(date);
  }

  private getFormatter(locale: string): Intl.DateTimeFormat {
    let formatter = this.formatters.get(locale);

    if (!formatter) {
      formatter = new Intl.DateTimeFormat(locale, {
        dateStyle: 'short',
        timeStyle: 'short',
      });

      this.formatters.set(locale, formatter);
    }

    return formatter;
  }
}
