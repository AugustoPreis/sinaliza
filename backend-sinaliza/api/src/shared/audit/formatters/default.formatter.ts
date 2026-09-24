import { Injectable } from '@nestjs/common';

import { IAuditFormatter } from '../interfaces';
import { stringifyUnknown } from '../utils/stringify.util';

/**
 * Fallback formatter used when a field has no custom/relation formatter.
 */
@Injectable()
export class DefaultFormatter implements IAuditFormatter {
  format(value: unknown): string {
    return stringifyUnknown(value);
  }
}
