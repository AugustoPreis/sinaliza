import { Injectable } from '@nestjs/common';

import { IPaginatedResult } from '@shared/interfaces';

import { AuditLogQueryDTO } from '../dtos/audit-log-query.dto';
import { AuditLogResponseDTO } from '../dtos/audit-log-response.dto';
import { AuditLogResponseMapper } from '../mappers/audit-log-response.mapper';
import { AuditLogsRepository } from '../repositories/audit-logs.repository';

@Injectable()
export class ListAuditLogsUseCase {
  constructor(
    private readonly auditLogsRepository: AuditLogsRepository,
    private readonly auditLogResponseMapper: AuditLogResponseMapper,
  ) {}

  async execute(
    query: AuditLogQueryDTO,
    locale: string,
  ): Promise<IPaginatedResult<AuditLogResponseDTO>> {
    const result = await this.auditLogsRepository.findAll(query.page, query.perPage, {
      entityName: query.entityName,
      entityUuid: query.entityUuid,
      actorUuid: query.actorUuid,
      action: query.action,
    });

    const data = await Promise.all(
      result.data.map((log) => this.auditLogResponseMapper.toResponseDTO(log, locale)),
    );

    return { data, meta: result.meta };
  }
}
