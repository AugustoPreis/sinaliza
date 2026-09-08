import { ApiProperty } from '@nestjs/swagger';

import { BuildingEntity } from '../entities/building.entity';
import { EnvironmentEntity } from '../entities/environment.entity';

// Field names/nesting follow `endpoints-sinaliza.md` §5.1 literally.
export class EnvironmentSummaryDTO {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  static from(entity: EnvironmentEntity): EnvironmentSummaryDTO {
    const dto = new EnvironmentSummaryDTO();

    dto.id = entity.uuid;
    dto.name = entity.name;

    return dto;
  }
}

export class BuildingResponseDTO {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ type: [EnvironmentSummaryDTO] })
  environments!: EnvironmentSummaryDTO[];

  static from(entity: BuildingEntity): BuildingResponseDTO {
    const dto = new BuildingResponseDTO();

    dto.id = entity.uuid;
    dto.name = entity.name;
    dto.environments = (entity.environments ?? []).map((environment) =>
      EnvironmentSummaryDTO.from(environment),
    );

    return dto;
  }
}
