import { Injectable } from '@nestjs/common';

import { UsersRepository } from '@modules/users/repositories/users.repository';

import { NotificationsRepository } from '../repositories/notifications.repository';

// Opening the history marks everything as read (no per-item read state in
// the UI), so there is a single "read all" operation.
@Injectable()
export class MarkNotificationsReadUseCase {
  constructor(
    private readonly notificationsRepository: NotificationsRepository,
    private readonly usersRepository: UsersRepository,
  ) {}

  async execute(currentUserUuid: string): Promise<void> {
    const user = await this.usersRepository.findByUuid(currentUserUuid);

    if (user) await this.notificationsRepository.markAllReadForUser(user.id);
  }
}
