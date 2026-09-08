import { ApiProperty } from '@nestjs/swagger';

import { IPaginatedResult } from '@shared/interfaces';

import { NotificationEntity } from '../entities/notification.entity';
import { ENotificationType } from '../enums/notification-type.enum';

// `GET /notifications` item shape (endpoints-sinaliza.md §9.1).
export class NotificationResponseDTO {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  ticket_id!: string;

  @ApiProperty()
  protocol!: string;

  @ApiProperty({ enum: ENotificationType })
  type!: ENotificationType;

  @ApiProperty()
  message!: string;

  @ApiProperty()
  created_at!: Date;

  static from(entity: NotificationEntity): NotificationResponseDTO {
    const dto = new NotificationResponseDTO();

    dto.id = entity.uuid;
    dto.ticket_id = entity.ticket.uuid;
    dto.protocol = entity.ticket.protocol;
    dto.type = entity.type;
    dto.message = entity.message;
    dto.created_at = entity.createdAt;

    return dto;
  }
}

// Same reasoning as `TicketListResponseDTO`: `items`/`page`/`page_size`/
// `total` follows the doc's own listing shape rather than the project's
// generic `{data, meta}` envelope.
export class NotificationListResponseDTO {
  @ApiProperty({ type: [NotificationResponseDTO] })
  items!: NotificationResponseDTO[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  page_size!: number;

  @ApiProperty()
  total!: number;

  static from(result: IPaginatedResult<NotificationEntity>): NotificationListResponseDTO {
    const dto = new NotificationListResponseDTO();

    dto.items = result.data.map((notification) => NotificationResponseDTO.from(notification));
    dto.page = result.meta.page;
    dto.page_size = result.meta.perPage;
    dto.total = result.meta.total;

    return dto;
  }
}
