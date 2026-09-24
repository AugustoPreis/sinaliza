import { HttpStatus, Injectable } from '@nestjs/common';

import { AppException } from '@shared/exceptions';

import { DiffEngine } from '../../diff/diff-engine';
import { IAuditRecordContext } from '../../interfaces';

/**
 * Third and final stage of the write-side pipeline: computes the field-level
 * diff between the normalized before/after snapshots.
 */
@Injectable()
export class DiffStage {
  execute(context: IAuditRecordContext): IAuditRecordContext {
    if (!context.metadata || !context.normalizedBefore || !context.normalizedAfter) {
      throw AppException.from('audit.errors.pipelineMisuse', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    const fields = [...context.metadata.fields.entries()]
      .filter(([, meta]) => !meta.ignore)
      .map(([field]) => field);

    const diffs = DiffEngine.diff(context.normalizedBefore, context.normalizedAfter, fields);

    return { ...context, diffs };
  }
}
