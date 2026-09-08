import { Injectable } from '@nestjs/common';

import { IAuditChangeSetContext } from '../../interfaces';
import { I18nAuditTranslator } from '../../translators/i18n-audit.translator';

/**
 * Second stage of the read-side pipeline: resolves the display label for
 * every field, preferring the decorator-provided `label` and falling back to
 * the i18n catalog.
 */
@Injectable()
export class TranslateStage {
  constructor(private readonly translator: I18nAuditTranslator) {}

  execute(context: IAuditChangeSetContext): IAuditChangeSetContext {
    const items = (context.items ?? []).map((item) => ({
      ...item,
      label: this.translator.translateField(
        context.metadata.module,
        context.entityName,
        item.field,
        context.locale,
        item.meta.label,
      ),
    }));

    return { ...context, items };
  }
}
