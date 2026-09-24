import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { SharedModule } from '@shared/shared.module';

import { SectorsModule } from '@modules/sectors/sectors.module';

import { ClassificationController } from './controllers/classification.controller';
import { HttpSectorClassifierStrategy } from './strategies/http-sector-classifier.strategy';
import { SECTOR_CLASSIFIER_STRATEGY } from './strategies/sector-classifier.strategy';
import { PreviewClassificationUseCase } from './use-cases/preview-classification.use-case';

// `HttpSectorClassifierStrategy` is bound to `SECTOR_CLASSIFIER_STRATEGY`
// so swapping the classification algorithm later only means changing the
// `useClass` line below - consumers depend on `ISectorClassifierStrategy`.
@Module({
  imports: [ConfigModule, SharedModule, SectorsModule],
  controllers: [ClassificationController],
  providers: [
    PreviewClassificationUseCase,
    { provide: SECTOR_CLASSIFIER_STRATEGY, useClass: HttpSectorClassifierStrategy },
  ],
  exports: [SECTOR_CLASSIFIER_STRATEGY],
})
export class ClassificationModule {}
