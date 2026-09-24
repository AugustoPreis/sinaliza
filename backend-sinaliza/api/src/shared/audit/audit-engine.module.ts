import { Module } from '@nestjs/common';

import { BooleanFormatter } from './formatters/boolean.formatter';
import { CurrencyFormatter } from './formatters/currency.formatter';
import { DateFormatter } from './formatters/date.formatter';
import { DefaultFormatter } from './formatters/default.formatter';
import { EnumFormatter } from './formatters/enum.formatter';
import { RelationFormatter } from './formatters/relation.formatter';
import { ArrayNormalizer } from './normalizers/array.normalizer';
import { BooleanNormalizer } from './normalizers/boolean.normalizer';
import { DateNormalizer } from './normalizers/date.normalizer';
import { DefaultNormalizer } from './normalizers/default.normalizer';
import { EnumNormalizer } from './normalizers/enum.normalizer';
import { AuditPipelineService } from './pipeline/audit-pipeline.service';
import { BuildDtoStage } from './pipeline/stages/build-dto.stage';
import { DiffStage } from './pipeline/stages/diff.stage';
import { FormatStage } from './pipeline/stages/format.stage';
import { LoadMetadataStage } from './pipeline/stages/load-metadata.stage';
import { NormalizeStage } from './pipeline/stages/normalize.stage';
import { ResolveRelationsStage } from './pipeline/stages/resolve-relations.stage';
import { TranslateStage } from './pipeline/stages/translate.stage';
import { I18nAuditTranslator } from './translators/i18n-audit.translator';

/**
 * Generic, reusable audit engine: decorators/registry/diff/normalizers/
 * formatters/translators/pipeline. Knows nothing about TypeORM, HTTP or any
 * specific feature module: `@modules/audit` is the only consumer that wires
 * it to persistence and to the outside world.
 *
 * Custom formatters/normalizers/relation-resolvers referenced from `@Audit()`
 * metadata are resolved at runtime via `ModuleRef`, so they must be provided
 * by some module imported (directly or transitively) by whichever module
 * declares them, or be registered as global providers.
 */
@Module({
  providers: [
    // Normalizers
    DefaultNormalizer,
    ArrayNormalizer,
    BooleanNormalizer,
    DateNormalizer,
    EnumNormalizer,

    // Translation
    I18nAuditTranslator,

    // Formatters
    DefaultFormatter,
    DateFormatter,
    CurrencyFormatter,
    BooleanFormatter,
    EnumFormatter,
    RelationFormatter,

    // Pipeline stages
    LoadMetadataStage,
    NormalizeStage,
    DiffStage,
    ResolveRelationsStage,
    TranslateStage,
    FormatStage,
    BuildDtoStage,

    // Orchestrator
    AuditPipelineService,
  ],
  exports: [AuditPipelineService],
})
export class AuditEngineModule {}
