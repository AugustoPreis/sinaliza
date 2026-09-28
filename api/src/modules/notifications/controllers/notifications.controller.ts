import { Controller, Get, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '@shared/decorators';
import { PaginationQueryDTO } from '@shared/dtos/pagination-query.dto';

import { NotificationListResponseDTO } from '../dtos/notification-response.dto';
import { UnreadNotificationsCountResponseDTO } from '../dtos/unread-notifications-count-response.dto';
import { GetUnreadNotificationsCountUseCase } from '../use-cases/get-unread-notifications-count.use-case';
import { ListNotificationsUseCase } from '../use-cases/list-notifications.use-case';
import { MarkNotificationsReadUseCase } from '../use-cases/mark-notifications-read.use-case';

// Self-service, no `@RequirePermission`, same idiom as `TicketsController#findMine`.
@ApiTags('Notifications')
@ApiBearerAuth()
@Controller({ path: 'notifications', version: '1' })
export class NotificationsController {
  constructor(
    private readonly listNotificationsUseCase: ListNotificationsUseCase,
    private readonly getUnreadNotificationsCountUseCase: GetUnreadNotificationsCountUseCase,
    private readonly markNotificationsReadUseCase: MarkNotificationsReadUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: "List the requester's own notification history (Tela A.7)" })
  findMine(
    @CurrentUser('uuid') currentUserUuid: string,
    @Query() query: PaginationQueryDTO,
  ): Promise<NotificationListResponseDTO> {
    return this.listNotificationsUseCase.execute(currentUserUuid, query);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Count of unread notifications (badge on the app tab)' })
  unreadCount(
    @CurrentUser('uuid') currentUserUuid: string,
  ): Promise<UnreadNotificationsCountResponseDTO> {
    return this.getUnreadNotificationsCountUseCase.execute(currentUserUuid);
  }

  @Post('read')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Mark all of the requester's notifications as read" })
  markAllRead(@CurrentUser('uuid') currentUserUuid: string): Promise<void> {
    return this.markNotificationsReadUseCase.execute(currentUserUuid);
  }
}
