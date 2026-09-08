import { Injectable } from '@nestjs/common';

import { IAuditNormalizer } from '../interfaces';

/**
 * Normalizes any date-like value (Date instance or parseable string) to ISO-8601.
 */
@Injectable()
export class DateNormalizer implements IAuditNormalizer {
  normalize(value: unknown): unknown {
    if (value === undefined || value === null || value === '') {
      return null;
    }

    const date = value instanceof Date ? value : new Date(value as string | number);

    if (Number.isNaN(date.getTime())) {
      return null;
    }

    return date.toISOString();
  }
}
