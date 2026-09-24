import { Injectable } from '@nestjs/common';

import { AuditFieldChangeDTO } from '../../dtos/audit-field-change.dto';
import { IAuditChangeSetContext } from '../../interfaces';

/**
 * Final stage of the read-side pipeline: converts the enriched work items
 * into the frontend-facing `AuditFieldChangeDTO[]`. The frontend never
 * interprets raw data itself; everything it needs is already resolved.
 */
@Injectable()
export class BuildDtoStage {
  execute(context: IAuditChangeSetContext): AuditFieldChangeDTO[] {
    return (context.items ?? []).map((item) => {
      const dto = new AuditFieldChangeDTO();

      dto.field = item.field;
      dto.label = item.label ?? item.field;
      dto.old = { value: item.rawOld, display: item.formattedOld ?? '' };
      dto.new = { value: item.rawNew, display: item.formattedNew ?? '' };

      return dto;
    });
  }
}
