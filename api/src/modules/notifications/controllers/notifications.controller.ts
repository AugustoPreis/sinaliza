import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '@shared/decorators';
import { PaginationQueryDTO } from '@shared/dtos/pagination-query.dto';


import { NotificationListResponseDTO } from '../dtos/notification-response.dto';
import { ListNotificationsUseCase } from '../use-cases/list-notifications.use-case';

// `GET /notifications` (endpoints-sinaliza.md §9.1) — self-service, no
// `@RequirePermission`, same idiom as `TicketsController#findMine`.
@ApiTags('Notifications')
@ApiBearerAuth()
@Controller({ path: 'notifications', version: '1' })
export class NotificationsController {
  constructor(private readonly listNotificationsUseCase: ListNotificationsUseCase) {}

  @Get()
  @ApiOperation({ summary: "List the requester's own notification history (Tela A.7)" })
  findMine(
    @CurrentUser('uuid') currentUserUuid: string,
    @Query() query: PaginationQueryDTO,
  ): Promise<NotificationListResponseDTO> {
    return this.listNotificationsUseCase.execute(currentUserUuid, query);
  }
}
