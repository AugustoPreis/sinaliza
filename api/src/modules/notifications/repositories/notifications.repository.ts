import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { IPaginatedResult } from '@shared/interfaces';
import { UuidService } from '@shared/services/uuid.service';
import { buildPaginatedResult, buildSkip } from '@shared/utils/pagination.util';


import { NotificationEntity } from '../entities/notification.entity';
import { ENotificationType } from '../enums/notification-type.enum';

@Injectable()
export class NotificationsRepository {
  constructor(
    @InjectRepository(NotificationEntity)
    private readonly repo: Repository<NotificationEntity>,
    private readonly uuidService: UuidService,
  ) {}

  // Called internally by other modules (Phase 4's status/reassign flows,
  // RB-14) — never exposed as its own HTTP endpoint. `NotificationsModule`
  // exports this repository specifically so those flows can call it.
  create(userId: number, ticketId: number, type: ENotificationType, message: string): Promise<NotificationEntity> {
    const entity = this.repo.create({
      uuid: this.uuidService.generate(),
      userId,
      ticketId,
      type,
      message,
    });

    return this.repo.save(entity);
  }

  async findManyForUser(
    userId: number,
    page: number,
    perPage: number,
  ): Promise<IPaginatedResult<NotificationEntity>> {
    const [data, total] = await this.repo.findAndCount({
      where: { userId },
      relations: { ticket: true },
      order: { createdAt: 'DESC' },
      skip: buildSkip(page, perPage),
      take: perPage,
    });

    return buildPaginatedResult(data, total, page, perPage);
  }
}
