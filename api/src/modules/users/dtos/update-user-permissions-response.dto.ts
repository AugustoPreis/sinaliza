import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserPermissionsResponseDTO {
  @ApiProperty()
  id!: string;

  @ApiProperty({ type: [String] })
  roles!: string[];

  @ApiProperty({ type: [String] })
  sector_ids!: string[];
}
