import { Injectable } from '@nestjs/common';

import { IAuditNormalizer } from '../interfaces';

/**
 * Passthrough normalizer used when a field has no custom normalizer.
 * Only canonicalizes `undefined` to `null` so the diff engine never has to
 * special-case it.
 */
@Injectable()
export class DefaultNormalizer implements IAuditNormalizer {
  normalize(value: unknown): unknown {
    return value === undefined ? null : value;
  }
}
