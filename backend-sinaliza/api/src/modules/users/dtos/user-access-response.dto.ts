import { ApiProperty } from '@nestjs/swagger';

import { UserEntity } from '../entities/user.entity';
import { EUserStatus } from '../enums/user-status.enum';

// `access_revoked` intentionally breaks camelCase to match the external
// contract the front-ends are built against.
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
