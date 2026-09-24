import { HttpStatus, Injectable } from '@nestjs/common';

import { AppException } from '@shared/exceptions';

import { IAuditRecordContext } from '../../interfaces';
import { AuditMetadataRegistry } from '../../registry/audit-metadata.registry';

/**
 * First stage of the write-side pipeline: resolves the `IAuditEntityMetadata`
 * for the entity name carried by the pipeline input, via the Registry only.
 */
@Injectable()
export class LoadMetadataStage {
  execute(context: IAuditRecordContext): IAuditRecordContext {
    const metadata = AuditMetadataRegistry.getByName(context.input.entityName);

    if (!metadata) {
      // Programming error: the entity emitting this event was never
      // decorated with @AuditEntity(). Surfaced as a 500 so it's logged and
      // fixed, but caught by the event listener so it never crashes the
      // emitting transaction.
      throw AppException.from('audit.errors.metadataNotFound', HttpStatus.INTERNAL_SERVER_ERROR, {
        args: { entityName: context.input.entityName },
      });
    }

    return { ...context, metadata };
  }
}
