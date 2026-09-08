import { ApiProperty } from '@nestjs/swagger';

import { SectorEntity } from '../entities/sector.entity';

// Unlike `SectorResponseDTO` (full `responsible_users` objects), create/
// update echo back only `responsible_user_ids`.
export class SectorMutationResponseDTO {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ type: [String] })
  categories!: string[];

  @ApiProperty({ type: [String] })
  responsible_user_ids!: string[];

  static from(entity: SectorEntity, responsibleUserUuids: string[]): SectorMutationResponseDTO {
    const dto = new SectorMutationResponseDTO();

    dto.id = entity.uuid;
    dto.name = entity.name;
    dto.categories = entity.categories ?? [];
    dto.responsible_user_ids = responsibleUserUuids;

    return dto;
  }
}
