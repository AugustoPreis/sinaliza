import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { I18nLang } from 'nestjs-i18n';

import { ApiPaginatedResponse, RequirePermission } from '@shared/decorators';
import { IPaginatedResult } from '@shared/interfaces';
import { ParseUuidPipe } from '@shared/pipes/parse-uuid.pipe';

import { AuditLogQueryDTO } from '../dtos/audit-log-query.dto';
import { AuditLogResponseDTO } from '../dtos/audit-log-response.dto';
import { FindAuditLogUseCase } from '../use-cases/find-audit-log.use-case';
import { ListAuditLogsUseCase } from '../use-cases/list-audit-logs.use-case';

@ApiTags('Audit Logs')
@ApiBearerAuth()
@Controller({ path: 'audit-logs', version: '1' })
export class AuditController {
  constructor(
    private readonly listAuditLogsUseCase: ListAuditLogsUseCase,
    private readonly findAuditLogUseCase: FindAuditLogUseCase,
  ) {}

  @Get()
  @RequirePermission('audit', 'read')
  @ApiOperation({ summary: 'List audit logs' })
  @ApiPaginatedResponse(AuditLogResponseDTO)
  findAll(
    @Query() query: AuditLogQueryDTO,
    @I18nLang() locale: string,
  ): Promise<IPaginatedResult<AuditLogResponseDTO>> {
    return this.listAuditLogsUseCase.execute(query, locale);
  }

  @Get(':uuid')
  @RequirePermission('audit', 'read')
  @ApiOperation({ summary: 'Get audit log by UUID' })
  findOne(
    @Param('uuid', ParseUuidPipe) uuid: string,
    @I18nLang() locale: string,
  ): Promise<AuditLogResponseDTO> {
    return this.findAuditLogUseCase.execute(uuid, locale);
  }
}
