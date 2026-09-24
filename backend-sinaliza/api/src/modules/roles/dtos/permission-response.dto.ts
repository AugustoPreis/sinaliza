import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { PermissionEntity } from '../entities/permission.entity';

export class PermissionResponseDTO {
  @ApiProperty()
  uuid!: string;

  @ApiProperty()
  resource!: string;

  @ApiProperty()
  action!: string;

  @ApiPropertyOptional({ nullable: true })
  description!: string | null;

  static from(entity: PermissionEntity): PermissionResponseDTO {
    const dto = new PermissionResponseDTO();

    dto.uuid = entity.uuid;
    dto.resource = entity.resource;
    dto.action = entity.action;
    dto.description = entity.description;

    return dto;
  }
}
