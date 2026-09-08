import { ApiProperty } from '@nestjs/swagger';

import { IsArray, IsString, IsUUID } from '@shared/validators';

// Field names follow `endpoints-sinaliza.md` §14.2 literally (`sector_ids`),
// which is why `sector_ids` isn't camelCased here — see
// `UpdateUserPermissionsUseCase` for how `roles`/`sector_ids` are resolved.
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
