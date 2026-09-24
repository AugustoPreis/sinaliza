import { mockDeep } from 'jest-mock-extended';

import { BuildingEntity } from '../../entities/building.entity';
import { LocationsRepository } from '../../repositories/locations.repository';
import { ListLocationsUseCase } from '../list-locations.use-case';

describe('ListLocationsUseCase', () => {
  const locationsRepository = mockDeep<LocationsRepository>();
  const useCase = new ListLocationsUseCase(locationsRepository);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns buildings with nested environments', async () => {
    const buildings = [
      {
        uuid: 'bld-1',
        name: 'Bloco A',
        environments: [{ uuid: 'env-1', name: 'Sala 101' }],
      },
    ] as BuildingEntity[];

    locationsRepository.findAllWithEnvironments.mockResolvedValue(buildings);

    const result = await useCase.execute();

    expect(result).toEqual({
      buildings: [
        {
          id: 'bld-1',
          name: 'Bloco A',
          environments: [{ id: 'env-1', name: 'Sala 101' }],
        },
      ],
    });
  });

  it('forwards the building filter to the repository', async () => {
    locationsRepository.findAllWithEnvironments.mockResolvedValue([]);

    await useCase.execute('bld-1');

    expect(locationsRepository.findAllWithEnvironments).toHaveBeenCalledWith('bld-1');
  });
});
