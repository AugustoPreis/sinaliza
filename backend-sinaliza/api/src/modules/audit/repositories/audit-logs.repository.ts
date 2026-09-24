import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { IPaginatedResult } from '@shared/interfaces';
import { buildPaginatedResult, buildSkip } from '@shared/utils/pagination.util';

import { AuditLogEntity } from '../entities/audit-log.entity';
import { EAuditAction } from '../enums/audit-action.enum';

@Injectable()
export class AuditLogsRepository {
  constructor(
    @InjectRepository(AuditLogEntity)
    private readonly repo: Repository<AuditLogEntity>,
  ) {}

  findByUuid(uuid: string): Promise<AuditLogEntity | null> {
    return this.repo.findOne({ where: { uuid } });
  }

  async findAll(
    page: number,
    perPage: number,
    filters: {
      entityName?: string;
      entityUuid?: string;
      actorUuid?: string;
      action?: EAuditAction;
    },
  ): Promise<IPaginatedResult<AuditLogEntity>> {
    const where: Record<string, string> = {};

    if (filters.entityName) {
      where.entityName = filters.entityName;
    }

    if (filters.entityUuid) {
      where.entityUuid = filters.entityUuid;
    }

    if (filters.actorUuid) {
      where.actorUuid = filters.actorUuid;
    }

    if (filters.action) {
      where.action = filters.action;
    }

    const [data, total] = await this.repo.findAndCount({
      where,
      skip: buildSkip(page, perPage),
      take: perPage,
      order: { createdAt: 'DESC' },
    });

    return buildPaginatedResult(data, total, page, perPage);
  }

  create(data: Partial<AuditLogEntity>): Promise<AuditLogEntity> {
    const entity = this.repo.create(data);

    return this.repo.save(entity);
  }
}
