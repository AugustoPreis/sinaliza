import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuditEngineModule } from '@shared/audit/audit-engine.module';
import { SharedModule } from '@shared/shared.module';

import { AuditController } from './controllers/audit.controller';
import { AuditLogEntity } from './entities/audit-log.entity';
import { AuditChangeListener } from './listeners/audit-change.listener';
import { AuditLogResponseMapper } from './mappers/audit-log-response.mapper';
import { AuditLogsRepository } from './repositories/audit-logs.repository';
import { AuditSubscriber } from './subscribers/audit.subscriber';
import { FindAuditLogUseCase } from './use-cases/find-audit-log.use-case';
import { ListAuditLogsUseCase } from './use-cases/list-audit-logs.use-case';
import { RecordAuditLogUseCase } from './use-cases/record-audit-log.use-case';

/**
 * Global so that `RecordAuditLogUseCase` (and, transitively, the audit event)
 * can be relied upon from any other module without each of them having to
 * import `AuditModule` explicitly.
 */
@Global()
@Module({
  imports: [SharedModule, AuditEngineModule, TypeOrmModule.forFeature([AuditLogEntity])],
  controllers: [AuditController],
  providers: [
    AuditLogsRepository,
    AuditLogResponseMapper,
    RecordAuditLogUseCase,
    ListAuditLogsUseCase,
    FindAuditLogUseCase,
    AuditChangeListener,
    AuditSubscriber,
  ],
  exports: [RecordAuditLogUseCase],
})
export class AuditModule {}
