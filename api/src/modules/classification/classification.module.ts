import { Module } from '@nestjs/common';

import { SharedModule } from '@shared/shared.module';

import { SectorsModule } from '@modules/sectors/sectors.module';

import { ClassificationController } from './controllers/classification.controller';
import { KeywordSectorClassifierStrategy } from './strategies/keyword-sector-classifier.strategy';
import { SECTOR_CLASSIFIER_STRATEGY } from './strategies/sector-classifier.strategy';
import { PreviewClassificationUseCase } from './use-cases/preview-classification.use-case';

// `KeywordSectorClassifierStrategy` is registered under the
// `SECTOR_CLASSIFIER_STRATEGY` token (inversion of dependency): swapping the
// classification algorithm later (real model/embeddings/etc.) means adding a
// new class implementing `SectorClassifierStrategy` and changing only the
// `useClass` line below — every consumer (this module's use-case, and
// whatever Phase 3's ticket creation injects) depends on the interface.
@Module({
  imports: [SharedModule, SectorsModule],
  controllers: [ClassificationController],
  providers: [
    PreviewClassificationUseCase,
    { provide: SECTOR_CLASSIFIER_STRATEGY, useClass: KeywordSectorClassifierStrategy },
  ],
  exports: [SECTOR_CLASSIFIER_STRATEGY],
})
export class ClassificationModule {}
