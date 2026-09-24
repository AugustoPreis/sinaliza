import { ApiProperty } from '@nestjs/swagger';

export class AuditValueDTO {
  @ApiProperty({ description: 'Raw/normalized value, as stored in the audit log.' })
  value!: unknown;

  @ApiProperty({ description: 'Human-readable, translated and formatted representation.' })
  display!: string;
}
