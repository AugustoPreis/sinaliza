import { mockDeep } from 'jest-mock-extended';

import { SectorEntity } from '../../entities/sector.entity';
import { SectorsRepository } from '../../repositories/sectors.repository';
import { ListAdminSectorsUseCase } from '../list-admin-sectors.use-case';

describe('ListAdminSectorsUseCase', () => {
  const sectorsRepository = mockDeep<SectorsRepository>();
  const useCase = new ListAdminSectorsUseCase(sectorsRepository);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns sectors with categories and responsible users', async () => {
    const sector = { id: 1, uuid: 'sec-ti', name: 'TI', categories: ['rede', 'wifi'] } as SectorEntity;

    sectorsRepository.search.mockResolvedValue([sector]);
    sectorsRepository.findResponsibleUsersBySectorIds.mockResolvedValue(
      new Map([[1, [{ uuid: 'usr-1', name: 'João', email: 'joao@ex.com' }] as never]]),
    );

    const result = await useCase.execute('ti');

    expect(sectorsRepository.search).toHaveBeenCalledWith('ti');
    expect(result.items).toEqual([
      {
        id: 'sec-ti',
        name: 'TI',
        categories: ['rede', 'wifi'],
        responsible_users: [{ id: 'usr-1', name: 'João', email: 'joao@ex.com' }],
      },
    ]);
  });
});
