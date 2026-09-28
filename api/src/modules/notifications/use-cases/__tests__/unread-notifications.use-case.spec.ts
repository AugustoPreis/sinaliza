import { mockDeep } from 'jest-mock-extended';

import { UsersRepository } from '@modules/users/repositories/users.repository';

import { NotificationsRepository } from '../../repositories/notifications.repository';
import { GetUnreadNotificationsCountUseCase } from '../get-unread-notifications-count.use-case';
import { MarkNotificationsReadUseCase } from '../mark-notifications-read.use-case';

describe('unread notifications', () => {
  const notificationsRepository = mockDeep<NotificationsRepository>();
  const usersRepository = mockDeep<UsersRepository>();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GetUnreadNotificationsCountUseCase', () => {
    const useCase = new GetUnreadNotificationsCountUseCase(
      notificationsRepository,
      usersRepository,
    );

    it('counts unread notifications of the resolved user', async () => {
      usersRepository.findByUuid.mockResolvedValue({ id: 7, uuid: 'usr-1' } as never);
      notificationsRepository.countUnreadForUser.mockResolvedValue(3);

      await expect(useCase.execute('usr-1')).resolves.toEqual({ count: 3 });
      expect(notificationsRepository.countUnreadForUser).toHaveBeenCalledWith(7);
    });

    it('returns 0 when the user no longer exists', async () => {
      usersRepository.findByUuid.mockResolvedValue(null);

      await expect(useCase.execute('gone')).resolves.toEqual({ count: 0 });
      expect(notificationsRepository.countUnreadForUser).not.toHaveBeenCalled();
    });
  });

  describe('MarkNotificationsReadUseCase', () => {
    const useCase = new MarkNotificationsReadUseCase(notificationsRepository, usersRepository);

    it('marks every notification of the resolved user as read', async () => {
      usersRepository.findByUuid.mockResolvedValue({ id: 7, uuid: 'usr-1' } as never);

      await useCase.execute('usr-1');

      expect(notificationsRepository.markAllReadForUser).toHaveBeenCalledWith(7);
    });

    it('does nothing when the user no longer exists', async () => {
      usersRepository.findByUuid.mockResolvedValue(null);

      await useCase.execute('gone');

      expect(notificationsRepository.markAllReadForUser).not.toHaveBeenCalled();
    });
  });
});
