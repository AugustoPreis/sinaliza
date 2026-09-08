import { ApiProperty } from '@nestjs/swagger';

import { IsEmail } from '@shared/validators';

export class ForgotPasswordDTO {
  @ApiProperty({ example: 'admin@email.com' })
  @IsEmail()
  email!: string;
}
