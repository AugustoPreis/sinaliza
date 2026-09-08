import { ApiProperty } from '@nestjs/swagger';

import { MeResponseDTO } from './me-response.dto';

export class LoginResponseDTO {
  @ApiProperty({ type: MeResponseDTO })
  user!: MeResponseDTO;
}
