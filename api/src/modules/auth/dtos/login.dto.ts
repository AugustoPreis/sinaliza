import { ApiProperty } from '@nestjs/swagger';

import { IsString, MinLength } from '@shared/validators';

export class LoginDTO {
  @ApiProperty({
    example: 'admin@email.com',
    description: 'E-mail institucional ou matrícula',
  })
  @IsString()
  @MinLength(1)
  identifier!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  password!: string;
}
