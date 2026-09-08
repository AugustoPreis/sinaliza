import { HttpStatus, Injectable } from '@nestjs/common';

import { AppException } from '@shared/exceptions';

import { AuditLogResponseDTO } from '../dtos/audit-log-response.dto';
import { AuditLogResponseMapper } from '../mappers/audit-log-response.mapper';
import { AuditLogsRepository } from '../repositories/audit-logs.repository';

@Injectable()
export class FindAuditLogUseCase {
  constructor(
    private readonly auditLogsRepository: AuditLogsRepository,
    private readonly auditLogResponseMapper: AuditLogResponseMapper,
  ) {}

  async execute(uuid: string, locale: string): Promise<AuditLogResponseDTO> {
    const log = await this.auditLogsRepository.findByUuid(uuid);

    if (!log) {
      throw AppException.from('audit.errors.notFound', HttpStatus.NOT_FOUND);
    }

    return this.auditLogResponseMapper.toResponseDTO(log, locale);
  }
}
