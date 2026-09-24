import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import {
  AUDIT_CHANGE_REQUESTED_EVENT,
  IAuditChangeRequestedEvent,
} from '../events/audit-change-requested.event';
import { RecordAuditLogUseCase } from '../use-cases/record-audit-log.use-case';

@Injectable()
export class AuditChangeListener {
  private readonly logger = new Logger(AuditChangeListener.name);

  constructor(private readonly recordAuditLogUseCase: RecordAuditLogUseCase) {}

  @OnEvent(AUDIT_CHANGE_REQUESTED_EVENT)
  async handleAuditChangeRequested(event: IAuditChangeRequestedEvent): Promise<void> {
    try {
      await this.recordAuditLogUseCase.execute(event);
    } catch (error) {
      this.logger.error(
        `Failed to record audit log for ${event.entityName}#${event.entityUuid}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
