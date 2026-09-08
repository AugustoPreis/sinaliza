import { ApiProperty } from '@nestjs/swagger';

import { RoleEntity } from '@modules/roles/entities/role.entity';

export class RoleSummaryDTO {
  @ApiProperty()
  uuid!: string;

  @ApiProperty()
  name!: string;

  static from(entity: RoleEntity): RoleSummaryDTO {
    const dto = new RoleSummaryDTO();

    dto.uuid = entity.uuid;
    dto.name = entity.name;

    return dto;
  }
}
