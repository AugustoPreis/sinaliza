import { Injectable } from '@nestjs/common';

import { PaginationQueryDTO } from '@shared/dtos/pagination-query.dto';

import { UsersRepository } from '@modules/users/repositories/users.repository';

import { NotificationListResponseDTO } from '../dtos/notification-response.dto';
import { NotificationsRepository } from '../repositories/notifications.repository';

// `GET /notifications` (endpoints-sinaliza.md §9.1) — self-service history
// of pushes sent to the authenticated requester (Tela A.7).
@Injectable()
export class ListNotificationsUseCase {
  constructor(
    private readonly notificationsRepository: NotificationsRepository,
    private readonly usersRepository: UsersRepository,
  ) {}

  async execute(currentUserUuid: string, query: PaginationQueryDTO): Promise<NotificationListResponseDTO> {
    const user = await this.usersRepository.findByUuid(currentUserUuid);

    if (!user) {
      return NotificationListResponseDTO.from({
        data: [],
        meta: { total: 0, page: query.page, perPage: query.perPage, lastPage: 0 },
      });
    }

    const result = await this.notificationsRepository.findManyForUser(user.id, query.page, query.perPage);

    return NotificationListResponseDTO.from(result);
  }
}
