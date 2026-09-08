import { ApiProperty } from '@nestjs/swagger';

import { UserEntity } from '../entities/user.entity';
import { EUserStatus } from '../enums/user-status.enum';

// Field names follow `endpoints-sinaliza.md` §14.3/14.4 literally
// (`id`/`access_revoked`), which deliberately breaks from this project's
// usual camelCase response convention — this is the contract the Sinaliza
// front-ends (app + portal) are built against.
export class UserAccessResponseDTO {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  access_revoked!: boolean;

  static from(entity: UserEntity): UserAccessResponseDTO {
    const dto = new UserAccessResponseDTO();

    dto.id = entity.uuid;
    dto.access_revoked = entity.status === EUserStatus.INACTIVE;

    return dto;
  }
}
