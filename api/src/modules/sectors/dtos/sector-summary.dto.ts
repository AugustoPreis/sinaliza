import { ApiProperty } from '@nestjs/swagger';

import { SectorEntity } from '../entities/sector.entity';

// Used by the public sector lookup - a picker only needs `id`/`name`,
// never categories or responsible users.
export class SectorSummaryDTO {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  static from(entity: SectorEntity): SectorSummaryDTO {
    const dto = new SectorSummaryDTO();

    dto.id = entity.uuid;
    dto.name = entity.name;

    return dto;
  }
}
