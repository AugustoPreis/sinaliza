import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { SectorEntity } from '@modules/sectors/entities/sector.entity';

export class AutomaticSectorDTO {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  static from(entity: SectorEntity): AutomaticSectorDTO {
    const dto = new AutomaticSectorDTO();

    dto.id = entity.uuid;
    dto.name = entity.name;

    return dto;
  }
}

export class ClassificationResponseDTO {
  @ApiProperty({ type: AutomaticSectorDTO })
  automatic_sector!: AutomaticSectorDTO;

  @ApiPropertyOptional()
  confidence?: number;

  static from(sector: SectorEntity, confidence?: number): ClassificationResponseDTO {
    const dto = new ClassificationResponseDTO();

    dto.automatic_sector = AutomaticSectorDTO.from(sector);
    dto.confidence = confidence;

    return dto;
  }
}
