import { Injectable } from '@nestjs/common';

import { IAuditFormatter } from '../interfaces';
import { stringifyUnknown } from '../utils/stringify.util';

/**
 * Default formatter applied to fields with a `relationResolver`. The actual
 * lookup already happened in `ResolveRelationsStage`; this formatter only
 * turns whatever came back (a string, a plain object, a raw fallback id...)
 * into a display-safe string.
 */
@Injectable()
export class RelationFormatter implements IAuditFormatter {
  format(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }

    if (typeof value === 'object') {
      const record = value as Record<string, unknown>;
      const candidate =
        record.display ?? record.name ?? record.label ?? record.title ?? record.id ?? record.uuid;

      return stringifyUnknown(candidate ?? record);
    }

    return stringifyUnknown(value);
  }
}
