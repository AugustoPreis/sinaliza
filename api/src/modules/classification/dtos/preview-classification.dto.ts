import { ApiProperty } from '@nestjs/swagger';

import { IsString, MaxLength, MinLength } from '@shared/validators';

export class PreviewClassificationDTO {
  @ApiProperty({ description: 'Free-text problem description (RB-02: text only, never photos)' })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  description!: string;
}
