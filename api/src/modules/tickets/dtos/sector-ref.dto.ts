import { ApiProperty } from '@nestjs/swagger';

import { SectorEntity } from '@modules/sectors/entities/sector.entity';

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
