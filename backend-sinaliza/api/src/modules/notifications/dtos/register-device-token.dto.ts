import { ApiProperty } from '@nestjs/swagger';

import { IsEnum, IsString, MaxLength } from '@shared/validators';

import { EDevicePlatform } from '../enums/device-platform.enum';

export class RegisterDeviceTokenDTO {
  @ApiProperty()
  @IsString()
  @MaxLength(4096)
  token!: string;

  @ApiProperty({ enum: EDevicePlatform })
  @IsEnum(EDevicePlatform)
  platform!: EDevicePlatform;
}
