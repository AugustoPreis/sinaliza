import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { UserEntity } from '../entities/user.entity';
import { EInstitutionalLink } from '../enums/institutional-link.enum';
import { EUserStatus } from '../enums/user-status.enum';

import { RoleSummaryDTO } from './role-summary.dto';

export class UserResponseDTO {
  @ApiProperty()
  uuid!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional({ nullable: true })
  institutionalId!: string | null;

  @ApiPropertyOptional({ enum: EInstitutionalLink, nullable: true })
  institutionalLink!: EInstitutionalLink | null;

  @ApiProperty({ enum: EUserStatus })
  status!: EUserStatus;

  @ApiProperty({ type: [RoleSummaryDTO] })
  roles!: RoleSummaryDTO[];

  @ApiProperty({ type: [String] })
  sectorUuids!: string[];

  @ApiProperty()
  createdAt!: Date;

  static from(entity: UserEntity): UserResponseDTO {
    const dto = new UserResponseDTO();

    dto.uuid = entity.uuid;
    dto.email = entity.email;
    dto.name = entity.name;
    dto.institutionalId = entity.institutionalId;
    dto.institutionalLink = entity.institutionalLink;
    dto.status = entity.status;
    dto.roles = entity.userRoles?.map((ur) => RoleSummaryDTO.from(ur.role)) ?? [];
    dto.sectorUuids = entity.sectorUsers?.map((su) => su.sector.uuid) ?? [];
    dto.createdAt = entity.createdAt;

    return dto;
  }
}
