import { ApiProperty } from '@nestjs/swagger';

// Field names follow `endpoints-sinaliza.md` §14.2 literally (`sector_ids`).
export class UpdateUserPermissionsResponseDTO {
  @ApiProperty()
  id!: string;

  @ApiProperty({ type: [String] })
  roles!: string[];

  @ApiProperty({ type: [String] })
  sector_ids!: string[];
}
