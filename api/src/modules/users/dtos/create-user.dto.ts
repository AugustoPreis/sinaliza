import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

import { PASSWORD_REGEX } from '@shared/constants';
import { IsArray, IsEmail, IsEnum, IsString, IsUUID, Matches, MaxLength, MinLength } from '@shared/validators';

import { EInstitutionalLink } from '../enums/institutional-link.enum';

export class CreateUserDTO {
  @ApiProperty()
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(255)
  name!: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  @Matches(PASSWORD_REGEX, { message: i18nValidationMessage('validation.passwordTooWeak') })
  password!: string;

  @ApiPropertyOptional({ description: 'Matrícula ou registro institucional' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  institutionalId?: string;

  @ApiPropertyOptional({ enum: EInstitutionalLink })
  @IsOptional()
  @IsEnum(EInstitutionalLink)
  institutionalLink?: EInstitutionalLink;

  @ApiPropertyOptional({ type: [String], description: 'Role UUIDs to assign to the user' })
  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  roleUuids?: string[];
}
