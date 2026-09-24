import { Injectable } from '@nestjs/common';

import { AuditFieldChangeDTO } from '../dtos/audit-field-change.dto';
import {
  IAuditChangeSetContext,
  IAuditPipelineInput,
  IAuditRecordContext,
  IFieldDiff,
} from '../interfaces';
import { AuditMetadataRegistry } from '../registry/audit-metadata.registry';
import { I18nAuditTranslator } from '../translators/i18n-audit.translator';
import { stringifyUnknown } from '../utils/stringify.util';

import { BuildDtoStage } from './stages/build-dto.stage';
import { DiffStage } from './stages/diff.stage';
import { FormatStage } from './stages/format.stage';
import { LoadMetadataStage } from './stages/load-metadata.stage';
import { NormalizeStage } from './stages/normalize.stage';
import { ResolveRelationsStage } from './stages/resolve-relations.stage';
import { TranslateStage } from './stages/translate.stage';

/**
 * Public entry point of the audit engine. Orchestrates the two pipelines:
 *
 * - Write side (`recordChange`): LoadMetadata -> Normalize -> Diff.
 *   Produces the raw, normalized `IFieldDiff[]` that gets persisted.
 * - Read side (`buildChangeSet`): ResolveRelations -> Translate -> Format ->
 *   BuildDto. Turns a persisted diff back into a display-ready DTO, using the
 *   locale of the current read request.
 */
@Injectable()
export class AuditPipelineService {
  constructor(
    private readonly loadMetadataStage: LoadMetadataStage,
    private readonly normalizeStage: NormalizeStage,
    private readonly diffStage: DiffStage,
    private readonly resolveRelationsStage: ResolveRelationsStage,
    private readonly translateStage: TranslateStage,
    private readonly formatStage: FormatStage,
    private readonly buildDtoStage: BuildDtoStage,
    private readonly translator: I18nAuditTranslator,
  ) {}

  recordChange(input: IAuditPipelineInput): Promise<IFieldDiff[]> {
    let context: IAuditRecordContext = { input };

    context = this.loadMetadataStage.execute(context);
    context = this.normalizeStage.execute(context);
    context = this.diffStage.execute(context);

    return Promise.resolve(context.diffs ?? []);
  }

  async buildChangeSet(
    entityName: string,
    changes: IFieldDiff[],
    locale: string,
  ): Promise<AuditFieldChangeDTO[]> {
    const metadata = AuditMetadataRegistry.getByName(entityName);

    if (!metadata) {
      return changes.map((change) => this.buildFallbackChange(change));
    }

    let context: IAuditChangeSetContext = { entityName, metadata, locale, changes };

    context = await this.resolveRelationsStage.execute(context);
    context = this.translateStage.execute(context);
    context = await this.formatStage.execute(context);

    return this.buildDtoStage.execute(context);
  }

  resolveEntityLabel(entityName: string, locale: string): string {
    const metadata = AuditMetadataRegistry.getByName(entityName);

    return this.translator.translateEntity(
      metadata?.module ?? entityName,
      entityName,
      locale,
      metadata?.label ?? entityName,
    );
  }

  private buildFallbackChange(change: IFieldDiff): AuditFieldChangeDTO {
    const dto = new AuditFieldChangeDTO();

    dto.field = change.field;
    dto.label = change.field;
    dto.old = { value: change.old, display: stringifyUnknown(change.old) };
    dto.new = { value: change.new, display: stringifyUnknown(change.new) };

    return dto;
  }
}
