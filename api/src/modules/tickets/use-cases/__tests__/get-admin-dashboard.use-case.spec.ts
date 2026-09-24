import { mockDeep } from 'jest-mock-extended';

import { LocationsRepository } from '@modules/locations/repositories/locations.repository';
import { SectorsRepository } from '@modules/sectors/repositories/sectors.repository';

import { AdminDashboardQueryDTO } from '../../dtos/admin-dashboard-query.dto';
import { IDashboardAggregates, TicketsRepository } from '../../repositories/tickets.repository';
import { GetAdminDashboardUseCase } from '../get-admin-dashboard.use-case';

describe('GetAdminDashboardUseCase', () => {
  const ticketsRepository = mockDeep<TicketsRepository>();
  const sectorsRepository = mockDeep<SectorsRepository>();
  const locationsRepository = mockDeep<LocationsRepository>();

  const useCase = new GetAdminDashboardUseCase(
    ticketsRepository,
    sectorsRepository,
    locationsRepository,
  );

  const query = new AdminDashboardQueryDTO();

  const aggregates: IDashboardAggregates = {
    volume: 248,
    resolvedCount: 189,
    averageCorrectSectorMinutes: 34.83,
    bySector: [{ sectorId: 10, forwarded: 12, inProgress: 7, resolved: 83 }],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    ticketsRepository.getDashboardAggregates.mockResolvedValue(aggregates);
    sectorsRepository.findAll.mockResolvedValue([{ id: 10, uuid: 'sec_ti', name: 'TI' } as never]);
  });

  it('computes resolved_percentage and rounds average_time_to_correct_sector_minutes to 1 decimal', async () => {
    const result = await useCase.execute(query);

    expect(result.summary).toEqual({
      volume: 248,
      resolved_percentage: 76.2,
      average_time_to_correct_sector_minutes: 34.8,
    });
  });

  it('maps by_sector using the resolved sector uuid/name', async () => {
    const result = await useCase.execute(query);

    expect(result.by_sector).toEqual([
      { sector_id: 'sec_ti', sector_name: 'TI', forwarded: 12, in_progress: 7, resolved: 83 },
    ]);
  });

  it('defaults resolved_percentage/average to 0 when there is no volume/no resolved ticket', async () => {
    ticketsRepository.getDashboardAggregates.mockResolvedValue({
      volume: 0,
      resolvedCount: 0,
      averageCorrectSectorMinutes: null,
      bySector: [],
    });

    const result = await useCase.execute(query);

    expect(result.summary).toEqual({
      volume: 0,
      resolved_percentage: 0,
      average_time_to_correct_sector_minutes: 0,
    });
  });

  it('resolves sector_id/building_id filters before querying aggregates', async () => {
    sectorsRepository.findByUuid.mockResolvedValue({ id: 10, uuid: 'sec_ti', name: 'TI' } as never);
    locationsRepository.findBuildingByUuid.mockResolvedValue({ id: 100, uuid: 'bld-1' } as never);

    await useCase.execute({ ...query, sector_id: 'sec_ti', building_id: 'bld-1' });

    expect(ticketsRepository.getDashboardAggregates).toHaveBeenCalledWith(
      expect.objectContaining({ sectorId: 10, buildingId: 100 }),
    );
  });

  it('throws when sector_id does not exist', async () => {
    sectorsRepository.findByUuid.mockResolvedValue(null);

    await expect(useCase.execute({ ...query, sector_id: 'missing' })).rejects.toMatchObject({
      i18nKey: 'sectors.errors.notFound',
    });
  });
});
