import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { RoleEntity } from '../entities/role.entity';

import { PermissionResponseDTO } from './permission-response.dto';

export class RoleResponseDTO {
  @ApiProperty()
  uuid!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional({ nullable: true })
  description!: string | null;

  @ApiProperty()
  isReserved!: boolean;

  @ApiProperty({ type: [PermissionResponseDTO] })
  permissions!: PermissionResponseDTO[];

  static from(entity: RoleEntity): RoleResponseDTO {
    const dto = new RoleResponseDTO();

    dto.uuid = entity.uuid;
    dto.name = entity.name;
    dto.description = entity.description;
    dto.isReserved = entity.isReserved;
    dto.permissions = entity.permissions?.map((p) => PermissionResponseDTO.from(p)) ?? [];

    return dto;
  }
}
