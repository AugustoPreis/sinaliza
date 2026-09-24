import { mockDeep } from 'jest-mock-extended';

import { PaginationQueryDTO } from '@shared/dtos/pagination-query.dto';

import { UsersRepository } from '@modules/users/repositories/users.repository';

import { NotificationEntity } from '../../entities/notification.entity';
import { ENotificationType } from '../../enums/notification-type.enum';
import { NotificationsRepository } from '../../repositories/notifications.repository';
import { ListNotificationsUseCase } from '../list-notifications.use-case';

describe('ListNotificationsUseCase', () => {
  const notificationsRepository = mockDeep<NotificationsRepository>();
  const usersRepository = mockDeep<UsersRepository>();
  const useCase = new ListNotificationsUseCase(notificationsRepository, usersRepository);

  const query = Object.assign(new PaginationQueryDTO(), { page: 1, perPage: 30 });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('scopes the listing to the resolved user id', async () => {
    usersRepository.findByUuid.mockResolvedValue({ id: 7, uuid: 'usr-1' } as never);
    notificationsRepository.findManyForUser.mockResolvedValue({
      data: [],
      meta: { total: 0, page: 1, perPage: 30, lastPage: 0 },
    });

    await useCase.execute('usr-1', query);

    expect(notificationsRepository.findManyForUser).toHaveBeenCalledWith(7, 1, 30);
  });

  it('maps entities into items/page/page_size/total', async () => {
    usersRepository.findByUuid.mockResolvedValue({ id: 7, uuid: 'usr-1' } as never);
    notificationsRepository.findManyForUser.mockResolvedValue({
      data: [
        {
          uuid: 'ntf-1',
          type: ENotificationType.TICKET_RESOLVED,
          message: 'Seu chamado SIN-1000 foi resolvido.',
          createdAt: new Date('2026-08-20T18:20:00Z'),
          ticket: { uuid: 'tkt-1', protocol: 'SIN-1000' },
        } as unknown as NotificationEntity,
      ],
      meta: { total: 1, page: 1, perPage: 30, lastPage: 1 },
    });

    const result = await useCase.execute('usr-1', query);

    expect(result).toEqual({
      items: [
        {
          id: 'ntf-1',
          ticket_id: 'tkt-1',
          protocol: 'SIN-1000',
          type: ENotificationType.TICKET_RESOLVED,
          message: 'Seu chamado SIN-1000 foi resolvido.',
          created_at: new Date('2026-08-20T18:20:00Z'),
        },
      ],
      page: 1,
      page_size: 30,
      total: 1,
    });
  });

  it('returns an empty page when the user cannot be resolved', async () => {
    usersRepository.findByUuid.mockResolvedValue(null);

    const result = await useCase.execute('missing', query);

    expect(notificationsRepository.findManyForUser).not.toHaveBeenCalled();
    expect(result.items).toEqual([]);
  });
});
