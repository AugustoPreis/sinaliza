import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';

import { IsArray, IsString, IsUUID, MaxLength } from '@shared/validators';

// Field names follow `endpoints-sinaliza.md` §12.2 literally
// (`responsible_user_ids`), same convention as `UpdateUserPermissionsDTO`.
export class CreateSectorDTO {
  @ApiProperty()
  @IsString()
  @MaxLength(255)
  name!: string;

  @ApiProperty({ type: [String], description: 'Tags used by the automatic classifier' })
  @IsArray()
  @IsString({ each: true })
  categories!: string[];

  @ApiPropertyOptional({ type: [String], description: 'User UUIDs responsible for this sector' })
  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  responsible_user_ids?: string[];
}
