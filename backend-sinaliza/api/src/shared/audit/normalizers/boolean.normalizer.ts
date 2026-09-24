import { Injectable } from '@nestjs/common';

import { IAuditNormalizer } from '../interfaces';

@Injectable()
export class BooleanNormalizer implements IAuditNormalizer {
  normalize(value: unknown): unknown {
    if (value === undefined || value === null) {
      return null;
    }

    return Boolean(value);
  }
}
