import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Field names follow `endpoints-sinaliza.md` §13.2 literally.
export interface IImportUsersErrorDetail {
  type: 'MISSING_COLUMN' | 'COLUMN_ORDER_MISMATCH' | 'INVALID_ROW';
  expected?: string;
  received?: string;
  column_index?: number;
  row?: number;
  message?: string;
}

export class ImportUsersResultDTO {
  @ApiProperty()
  success!: boolean;

  @ApiPropertyOptional()
  error?: 'INVALID_TEMPLATE';

  @ApiPropertyOptional({ type: [Object] })
  details?: IImportUsersErrorDetail[];

  @ApiProperty()
  created!: number;

  @ApiProperty()
  updated!: number;
}
