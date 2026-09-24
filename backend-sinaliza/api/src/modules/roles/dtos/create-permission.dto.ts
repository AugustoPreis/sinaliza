import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

import { IsNotEmpty, IsString, Length, Matches } from '@shared/validators';

export class CreatePermissionDTO {
  @ApiProperty({
    example: 'users',
    description: 'Resource this permission applies to',
  })
  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  @Matches(/^[a-z_]+$/, { message: i18nValidationMessage('validation.resourceFormat') })
  resource!: string;

  @ApiProperty({
    example: 'read',
    description: 'Action allowed on the resource',
  })
  @IsString()
  @IsNotEmpty()
  @Length(1, 50)
  @Matches(/^[a-z_]+$/, { message: i18nValidationMessage('validation.actionFormat') })
  action!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}
