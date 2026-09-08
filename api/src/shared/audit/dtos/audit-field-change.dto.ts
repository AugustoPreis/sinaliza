import { ApiProperty } from '@nestjs/swagger';

import { AuditValueDTO } from './audit-value.dto';

export class AuditFieldChangeDTO {
  @ApiProperty()
  field!: string;

  @ApiProperty()
  label!: string;

  @ApiProperty({ type: AuditValueDTO })
  old!: AuditValueDTO;

  @ApiProperty({ type: AuditValueDTO })
  new!: AuditValueDTO;
}
