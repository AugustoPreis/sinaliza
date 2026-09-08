import { mockDeep } from 'jest-mock-extended';

import { LocationsRepository } from '@modules/locations/repositories/locations.repository';
import { SectorsRepository } from '@modules/sectors/repositories/sectors.repository';

import { ResearchIndicatorsQueryDTO } from '../../dtos/research-indicators-query.dto';
import { IResearchIndicatorsData, ResearchRepository } from '../../repositories/research.repository';
import { GetResearchIndicatorsUseCase } from '../get-research-indicators.use-case';

describe('GetResearchIndicatorsUseCase', () => {
  const researchRepository = mockDeep<ResearchRepository>();
  const sectorsRepository = mockDeep<SectorsRepository>();
  const locationsRepository = mockDeep<LocationsRepository>();

  const useCase = new GetResearchIndicatorsUseCase(
    researchRepository,
    sectorsRepository,
    locationsRepository,
  );

  const query = new ResearchIndicatorsQueryDTO();

  const sectorTI = { id: 10, uuid: 'sec_ti', name: 'TI', categories: ['equipamento', 'rede'] };
  const sectorManutencao = {
    id: 20,
    uuid: 'sec_manutencao',
    name: 'Manutenção Predial',
    categories: [],
  };

  const buildingA = { id: 100, uuid: 'bld_01', name: 'Bloco A' };

  const data: IResearchIndicatorsData = {
    totalTickets: 200,
    correctWithoutAnyCorrection: 162,
    correctionsByRequester: 22,
    correctionsBySector: 16,
    correctSectorMinutes: [10, 20, 30, 40],
    volumeBySector: [
      { key: 10, count: 67 },
      { key: 20, count: 133 },
    ],
    volumeByAutomaticSector: [
      { key: 10, count: 43 },
      { key: 20, count: 157 },
    ],
    volumeByLocation: [{ key: 100, count: 55 }],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    researchRepository.getIndicatorsData.mockResolvedValue(data);
    sectorsRepository.findAll.mockResolvedValue([sectorTI, sectorManutencao] as never);
    locationsRepository.findAllWithEnvironments.mockResolvedValue([buildingA] as never);
  });

  it('computes the automatic accuracy percentage', async () => {
    const result = await useCase.execute(query);

    expect(result.automatic_accuracy).toEqual({
      total_tickets: 200,
      correct_without_any_correction: 162,
      percentage: 81.0,
    });
  });

  it('defaults percentage to 0 when there are no tickets', async () => {
    researchRepository.getIndicatorsData.mockResolvedValue({ ...data, totalTickets: 0 });

    const result = await useCase.execute(query);

    expect(result.automatic_accuracy.percentage).toBe(0);
  });

  it('maps corrections by requester/sector as-is', async () => {
    const result = await useCase.execute(query);

    expect(result.corrections).toEqual({ by_requester: 22, by_sector: 16 });
  });

  it('computes average/median minutes from the raw sample array', async () => {
    const result = await useCase.execute(query);

    expect(result.time_to_correct_sector).toEqual({ average_minutes: 25, median_minutes: 25 });
  });

  it('defaults time_to_correct_sector to 0 when there are no samples', async () => {
    researchRepository.getIndicatorsData.mockResolvedValue({ ...data, correctSectorMinutes: [] });

    const result = await useCase.execute(query);

    expect(result.time_to_correct_sector).toEqual({ average_minutes: 0, median_minutes: 0 });
  });

  it('computes the median for an odd-sized sample', async () => {
    researchRepository.getIndicatorsData.mockResolvedValue({
      ...data,
      correctSectorMinutes: [10, 20, 60],
    });

    const result = await useCase.execute(query);

    expect(result.time_to_correct_sector.median_minutes).toBe(20);
  });

  it('maps volume by_sector using the resolved sector uuid/name', async () => {
    const result = await useCase.execute(query);

    expect(result.volume.by_sector).toEqual([
      { sector_id: 'sec_ti', sector_name: 'TI', count: 67 },
      { sector_id: 'sec_manutencao', sector_name: 'Manutenção Predial', count: 133 },
    ]);
  });

  it('maps volume by_location using the resolved building uuid/name', async () => {
    const result = await useCase.execute(query);

    expect(result.volume.by_location).toEqual([
      { building_id: 'bld_01', building_name: 'Bloco A', count: 55 },
    ]);
  });

  it("derives by_category from each sector's first category tag, falling back to its name", async () => {
    const result = await useCase.execute(query);

    // sectorTI (43 tickets) -> 'equipamento' (its first category)
    // sectorManutencao (157 tickets) -> 'Manutenção Predial' (no categories configured)
    expect(result.volume.by_category).toEqual([
      { category: 'Manutenção Predial', count: 157 },
      { category: 'equipamento', count: 43 },
    ]);
  });

  it('merges by_category counts when two sectors resolve to the same label', async () => {
    researchRepository.getIndicatorsData.mockResolvedValue({
      ...data,
      volumeByAutomaticSector: [
        { key: 10, count: 5 },
        { key: 20, count: 3 },
      ],
    });
    sectorsRepository.findAll.mockResolvedValue([
      { ...sectorTI, categories: ['vazamento'] },
      { ...sectorManutencao, categories: ['vazamento'] },
    ] as never);

    const result = await useCase.execute(query);

    expect(result.volume.by_category).toEqual([{ category: 'vazamento', count: 8 }]);
  });

  it('resolves sector_id/building_id filters before querying aggregates', async () => {
    sectorsRepository.findByUuid.mockResolvedValue(sectorTI as never);
    locationsRepository.findBuildingByUuid.mockResolvedValue(buildingA as never);

    await useCase.execute({ ...query, sector_id: 'sec_ti', building_id: 'bld_01' });

    expect(researchRepository.getIndicatorsData).toHaveBeenCalledWith(
      expect.objectContaining({ sectorId: 10, buildingId: 100 }),
    );
  });

  it('throws when sector_id does not exist', async () => {
    sectorsRepository.findByUuid.mockResolvedValue(null);

    await expect(useCase.execute({ ...query, sector_id: 'missing' })).rejects.toMatchObject({
      i18nKey: 'sectors.errors.notFound',
    });
  });

  it('throws when building_id does not exist', async () => {
    locationsRepository.findBuildingByUuid.mockResolvedValue(null);

    await expect(useCase.execute({ ...query, building_id: 'missing' })).rejects.toMatchObject({
      i18nKey: 'locations.errors.buildingNotFound',
    });
  });
});
