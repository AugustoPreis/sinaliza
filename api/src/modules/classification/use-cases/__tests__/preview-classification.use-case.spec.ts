import { HttpStatus } from '@nestjs/common';
import { mockDeep } from 'jest-mock-extended';

import { SectorEntity } from '@modules/sectors/entities/sector.entity';
import { SectorsRepository } from '@modules/sectors/repositories/sectors.repository';

import { SectorClassifierStrategy } from '../../strategies/sector-classifier.strategy';
import { PreviewClassificationUseCase } from '../preview-classification.use-case';

describe('PreviewClassificationUseCase', () => {
  const sectorsRepository = mockDeep<SectorsRepository>();
  const classifier = mockDeep<SectorClassifierStrategy>();
  const useCase = new PreviewClassificationUseCase(sectorsRepository, classifier);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('throws when there are no sectors registered', async () => {
    sectorsRepository.findAll.mockResolvedValue([]);

    await expect(useCase.execute({ description: 'algo quebrou' })).rejects.toMatchObject({
      i18nKey: 'classification.errors.noSectorsAvailable',
      status: HttpStatus.UNPROCESSABLE_ENTITY,
    });

    expect(classifier.classify).not.toHaveBeenCalled();
  });

  it('delegates to the strategy and maps the result', async () => {
    const sector = { uuid: 'sec-ti', name: 'TI' } as SectorEntity;

    sectorsRepository.findAll.mockResolvedValue([sector]);
    classifier.classify.mockResolvedValue({ sector, confidence: 0.8 });

    const result = await useCase.execute({ description: 'o projetor não liga' });

    expect(classifier.classify).toHaveBeenCalledWith('o projetor não liga', [sector]);
    expect(result).toEqual({
      automatic_sector: { id: 'sec-ti', name: 'TI' },
      confidence: 0.8,
    });
  });
});
