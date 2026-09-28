import { Injectable } from '@nestjs/common';

import { UsersRepository } from '@modules/users/repositories/users.repository';

import { UnreadNotificationsCountResponseDTO } from '../dtos/unread-notifications-count-response.dto';
import { NotificationsRepository } from '../repositories/notifications.repository';

@Injectable()
export class GetUnreadNotificationsCountUseCase {
  constructor(
    private readonly notificationsRepository: NotificationsRepository,
    private readonly usersRepository: UsersRepository,
  ) {}

  async execute(currentUserUuid: string): Promise<UnreadNotificationsCountResponseDTO> {
    const user = await this.usersRepository.findByUuid(currentUserUuid);
    const count = user ? await this.notificationsRepository.countUnreadForUser(user.id) : 0;

    return UnreadNotificationsCountResponseDTO.from(count);
  }
}
