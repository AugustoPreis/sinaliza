import { HttpStatus } from '@nestjs/common';
import { mockDeep } from 'jest-mock-extended';

import { UuidService } from '@shared/services/uuid.service';

import { SectorEntity } from '../../entities/sector.entity';
import { SectorsRepository } from '../../repositories/sectors.repository';
import { CreateSectorUseCase } from '../create-sector.use-case';

describe('CreateSectorUseCase', () => {
  const sectorsRepository = mockDeep<SectorsRepository>();
  const uuidService = mockDeep<UuidService>();
  const useCase = new CreateSectorUseCase(sectorsRepository, uuidService);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a sector without responsible users', async () => {
    const sector = { id: 1, uuid: 'sec-1', name: 'TI', categories: ['rede'] } as SectorEntity;

    sectorsRepository.create.mockResolvedValue(sector);

    const result = await useCase.execute({ name: 'TI', categories: ['rede'] });

    expect(sectorsRepository.setResponsibleUsers).not.toHaveBeenCalled();
    expect(result).toEqual({
      id: 'sec-1',
      name: 'TI',
      categories: ['rede'],
      responsible_user_ids: [],
    });
  });

  it('resolves and assigns responsible users', async () => {
    const sector = { id: 1, uuid: 'sec-1', name: 'TI', categories: ['rede'] } as SectorEntity;

    sectorsRepository.create.mockResolvedValue(sector);
    sectorsRepository.findUsersByUuids.mockResolvedValue([{ id: 10, uuid: 'usr-1' } as never]);

    const result = await useCase.execute({
      name: 'TI',
      categories: ['rede'],
      responsible_user_ids: ['usr-1'],
    });

    expect(sectorsRepository.setResponsibleUsers).toHaveBeenCalledWith(1, [10]);
    expect(result.responsible_user_ids).toEqual(['usr-1']);
  });

  it('throws when a responsible user is not found', async () => {
    sectorsRepository.create.mockResolvedValue({ id: 1, uuid: 'sec-1' } as SectorEntity);
    sectorsRepository.findUsersByUuids.mockResolvedValue([]);

    await expect(
      useCase.execute({ name: 'TI', categories: [], responsible_user_ids: ['usr-missing'] }),
    ).rejects.toMatchObject({
      i18nKey: 'users.errors.notFound',
      status: HttpStatus.NOT_FOUND,
    });
  });
});
