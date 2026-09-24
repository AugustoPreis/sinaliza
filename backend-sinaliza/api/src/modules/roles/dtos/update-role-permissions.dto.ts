import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';

import { IsArray, IsNotEmpty, IsString } from '@shared/validators';

export class PermissionKeyDTO {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  resource!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  action!: string;
}

export class UpdateRolePermissionsDTO {
  @ApiProperty({ type: [PermissionKeyDTO], description: 'Permissions to assign to the role' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PermissionKeyDTO)
  permissions!: PermissionKeyDTO[];
}
