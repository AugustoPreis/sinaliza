import { ApiProperty } from '@nestjs/swagger';

import { UserEntity } from '@modules/users/entities/user.entity';

import { SectorEntity } from '../entities/sector.entity';

// Field names follow `endpoints-sinaliza.md` §12.1 literally
// (`responsible_users` as `{id, name, email}` objects, not just UUIDs) —
// this is the admin-facing shape (Tela C.2), unlike the enxuto
// `SectorSummaryDTO` used by the public lookup.
export class SectorResponsibleUserDTO {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  email!: string;

  static from(entity: UserEntity): SectorResponsibleUserDTO {
    const dto = new SectorResponsibleUserDTO();

    dto.id = entity.uuid;
    dto.name = entity.name;
    dto.email = entity.email;

    return dto;
  }
}

export class SectorResponseDTO {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ type: [String] })
  categories!: string[];

  @ApiProperty({ type: [SectorResponsibleUserDTO] })
  responsible_users!: SectorResponsibleUserDTO[];

  static from(entity: SectorEntity, responsibleUsers: UserEntity[] = []): SectorResponseDTO {
    const dto = new SectorResponseDTO();

    dto.id = entity.uuid;
    dto.name = entity.name;
    dto.categories = entity.categories ?? [];
    dto.responsible_users = responsibleUsers.map((user) => SectorResponsibleUserDTO.from(user));

    return dto;
  }
}
