import { ApiProperty } from '@nestjs/swagger';

import { SectorEntity } from '../entities/sector.entity';

// Enxuto: used by the public sector lookup (`GET /sectors`,
// endpoints-sinaliza.md §6.1) — the Tela A.4 sector picker only needs
// `id`/`name`, never categories or responsible users.
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
