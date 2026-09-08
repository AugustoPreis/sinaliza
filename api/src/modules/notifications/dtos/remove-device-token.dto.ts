import { ApiProperty } from '@nestjs/swagger';

import { IsString, MaxLength } from '@shared/validators';

// `DELETE /devices/push-token` (endpoints-sinaliza.md §4.2).
export class RemoveDeviceTokenDTO {
  @ApiProperty()
  @IsString()
  @MaxLength(4096)
  token!: string;
}
