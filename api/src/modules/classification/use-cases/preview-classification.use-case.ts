import { HttpStatus, Inject, Injectable } from '@nestjs/common';

import { AppException } from '@shared/exceptions';

import { SectorsRepository } from '@modules/sectors/repositories/sectors.repository';

import { ClassificationResponseDTO } from '../dtos/classification-response.dto';
import { PreviewClassificationDTO } from '../dtos/preview-classification.dto';
import { SECTOR_CLASSIFIER_STRATEGY, SectorClassifierStrategy } from '../strategies/sector-classifier.strategy';

// `POST /classification/preview` (endpoints-sinaliza.md §7.1). Does NOT
// create a ticket — just returns the suggestion for Tela A.4. RB-02: only
// `dto.description` (text) ever reaches the strategy, never photos.
@Injectable()
export class PreviewClassificationUseCase {
  constructor(
    private readonly sectorsRepository: SectorsRepository,
    @Inject(SECTOR_CLASSIFIER_STRATEGY)
    private readonly classifier: SectorClassifierStrategy,
  ) {}

  async execute(dto: PreviewClassificationDTO): Promise<ClassificationResponseDTO> {
    const sectors = await this.sectorsRepository.findAll();

    if (!sectors.length) {
      throw AppException.from('classification.errors.noSectorsAvailable', HttpStatus.UNPROCESSABLE_ENTITY);
    }

    const result = await this.classifier.classify(dto.description, sectors);

    return ClassificationResponseDTO.from(result.sector, result.confidence);
  }
}
