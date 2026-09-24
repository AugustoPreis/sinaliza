import { ApiProperty } from '@nestjs/swagger';

import { IsArray, IsString, IsUUID } from '@shared/validators';

// `sector_ids` intentionally breaks camelCase to match the external contract.
export class UpdateUserPermissionsDTO {
  @ApiProperty({
    type: [String],
    description: 'Role names to assign to the user (e.g. "ADMIN", "SECTOR", "REQUESTER")',
  })
  @IsArray()
  @IsString({ each: true })
  roles!: string[];

  @ApiProperty({ type: [String], description: 'Sector UUIDs the user is responsible for' })
  @IsArray()
  @IsUUID('all', { each: true })
  sector_ids!: string[];
}
