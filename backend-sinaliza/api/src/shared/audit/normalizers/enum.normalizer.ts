import { Injectable } from '@nestjs/common';

import { IAuditNormalizer } from '../interfaces';
import { stringifyUnknown } from '../utils/stringify.util';

/**
 * Normalizes an enum-like value to its internal string representation.
 */
@Injectable()
export class EnumNormalizer implements IAuditNormalizer {
  normalize(value: unknown): unknown {
    if (value === undefined || value === null) {
      return null;
    }

    return stringifyUnknown(value);
  }
}
