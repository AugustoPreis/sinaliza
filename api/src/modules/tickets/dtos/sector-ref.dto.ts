import { ApiProperty } from '@nestjs/swagger';

import { SectorEntity } from '@modules/sectors/entities/sector.entity';

// `{id, name}` shape reused across every ticket response
// (endpoints-sinaliza.md §8) for `automatic_sector`/`confirmed_sector`/
// `current_sector`.
export class SectorRefDTO {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  static from(entity: SectorEntity): SectorRefDTO {
    const dto = new SectorRefDTO();

    dto.id = entity.uuid;
    dto.name = entity.name;

    return dto;
  }
}
