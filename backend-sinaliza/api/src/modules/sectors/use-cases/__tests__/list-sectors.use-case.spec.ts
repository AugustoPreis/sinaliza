import { mockDeep } from 'jest-mock-extended';

import { SectorEntity } from '../../entities/sector.entity';
import { SectorsRepository } from '../../repositories/sectors.repository';
import { ListSectorsUseCase } from '../list-sectors.use-case';

describe('ListSectorsUseCase', () => {
  const sectorsRepository = mockDeep<SectorsRepository>();
  const useCase = new ListSectorsUseCase(sectorsRepository);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the sector lookup as enxuto items', async () => {
    const sectors = [
      { uuid: 'sec-ti', name: 'TI' },
      { uuid: 'sec-manutencao', name: 'Manutenção Predial' },
    ] as SectorEntity[];

    sectorsRepository.findAll.mockResolvedValue(sectors);

    const result = await useCase.execute();

    expect(result).toEqual({
      items: [
        { id: 'sec-ti', name: 'TI' },
        { id: 'sec-manutencao', name: 'Manutenção Predial' },
      ],
    });
  });
});
