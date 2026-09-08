import { ApiProperty } from '@nestjs/swagger';

import { IsString, MaxLength } from '@shared/validators';

export class RemoveDeviceTokenDTO {
  @ApiProperty()
  @IsString()
  @MaxLength(4096)
  token!: string;
}
