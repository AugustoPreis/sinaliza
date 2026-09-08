import { HttpStatus } from '@nestjs/common';
import { mockDeep } from 'jest-mock-extended';

import { SectorEntity } from '../../entities/sector.entity';
import { SectorsRepository } from '../../repositories/sectors.repository';
import { UpdateSectorUseCase } from '../update-sector.use-case';

describe('UpdateSectorUseCase', () => {
  const sectorsRepository = mockDeep<SectorsRepository>();
  const useCase = new UpdateSectorUseCase(sectorsRepository);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('throws when the sector does not exist', async () => {
    sectorsRepository.findByUuid.mockResolvedValue(null);

    await expect(useCase.execute('missing', {})).rejects.toMatchObject({
      i18nKey: 'sectors.errors.notFound',
      status: HttpStatus.NOT_FOUND,
    });
  });

  it('updates name/categories and keeps current responsible users when not provided', async () => {
    const sector = { id: 1, uuid: 'sec-1', name: 'TI', categories: ['rede'] } as SectorEntity;
    const updated = { ...sector, name: 'TI Renomeado' };

    sectorsRepository.findByUuid.mockResolvedValue(sector);
    sectorsRepository.update.mockResolvedValue(updated);
    sectorsRepository.findResponsibleUsers.mockResolvedValue([{ uuid: 'usr-1' } as never]);

    const result = await useCase.execute('sec-1', { name: 'TI Renomeado' });

    expect(sectorsRepository.setResponsibleUsers).not.toHaveBeenCalled();
    expect(result.name).toBe('TI Renomeado');
    expect(result.responsible_user_ids).toEqual(['usr-1']);
  });

  it('replaces responsible users when provided', async () => {
    const sector = { id: 1, uuid: 'sec-1', name: 'TI', categories: ['rede'] } as SectorEntity;

    sectorsRepository.findByUuid.mockResolvedValue(sector);
    sectorsRepository.update.mockResolvedValue(sector);
    sectorsRepository.findUsersByUuids.mockResolvedValue([{ id: 20, uuid: 'usr-2' } as never]);

    const result = await useCase.execute('sec-1', { responsible_user_ids: ['usr-2'] });

    expect(sectorsRepository.setResponsibleUsers).toHaveBeenCalledWith(1, [20]);
    expect(result.responsible_user_ids).toEqual(['usr-2']);
  });
});
