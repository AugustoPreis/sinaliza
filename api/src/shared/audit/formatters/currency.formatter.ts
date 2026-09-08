import { Injectable } from '@nestjs/common';

import { IAuditFormatContext, IAuditFormatter } from '../interfaces';
import { stringifyUnknown } from '../utils/stringify.util';

@Injectable()
export class CurrencyFormatter implements IAuditFormatter {
  private readonly formatters = new Map<string, Intl.NumberFormat>();

  format(value: unknown, context: IAuditFormatContext): string {
    if (value === null || value === undefined || value === '') {
      return '';
    }

    const amount = Number(value);

    if (Number.isNaN(amount)) {
      return stringifyUnknown(value);
    }

    return this.getFormatter(context.locale).format(amount);
  }

  private getFormatter(locale: string): Intl.NumberFormat {
    let formatter = this.formatters.get(locale);

    if (!formatter) {
      formatter = new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: 'BRL',
      });

      this.formatters.set(locale, formatter);
    }

    return formatter;
  }
}
