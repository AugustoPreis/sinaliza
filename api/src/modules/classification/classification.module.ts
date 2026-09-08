import { Module } from '@nestjs/common';

import { SharedModule } from '@shared/shared.module';

import { SectorsModule } from '@modules/sectors/sectors.module';

import { ClassificationController } from './controllers/classification.controller';
import { KeywordSectorClassifierStrategy } from './strategies/keyword-sector-classifier.strategy';
import { SECTOR_CLASSIFIER_STRATEGY } from './strategies/sector-classifier.strategy';
import { PreviewClassificationUseCase } from './use-cases/preview-classification.use-case';

// `KeywordSectorClassifierStrategy` is bound to `SECTOR_CLASSIFIER_STRATEGY`
// so swapping the classification algorithm later only means changing the
// `useClass` line below — consumers depend on `ISectorClassifierStrategy`.
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
