import { HttpStatus, Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';

import { AppException } from '@shared/exceptions';

import { IAuditRecordContext } from '../../interfaces';
import { DefaultNormalizer } from '../../normalizers/default.normalizer';

/**
 * Second stage of the write-side pipeline: normalizes every tracked field of
 * `before`/`after` using the field's custom normalizer (resolved at runtime
 * via `ModuleRef`) or the `DefaultNormalizer` when none is configured.
 */
@Injectable()
export class NormalizeStage {
  constructor(
    private readonly moduleRef: ModuleRef,
    private readonly defaultNormalizer: DefaultNormalizer,
  ) {}

  execute(context: IAuditRecordContext): IAuditRecordContext {
    if (!context.metadata) {
      throw AppException.from('audit.errors.pipelineMisuse', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    const normalizedBefore: Record<string, unknown> = {};
    const normalizedAfter: Record<string, unknown> = {};

    for (const [field, meta] of context.metadata.fields) {
      if (meta.ignore) {
        continue;
      }

      const normalizer = meta.normalizer
        ? (this.moduleRef.get(meta.normalizer, { strict: false }) ?? this.defaultNormalizer)
        : this.defaultNormalizer;

      normalizedBefore[field] = normalizer.normalize(context.input.before?.[field]);
      normalizedAfter[field] = normalizer.normalize(context.input.after?.[field]);
    }

    return { ...context, normalizedBefore, normalizedAfter };
  }
}
