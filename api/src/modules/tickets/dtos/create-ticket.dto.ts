import { ApiProperty } from '@nestjs/swagger';
import { plainToInstance, Transform, Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';

import { IsString, IsUUID, MaxLength } from '@shared/validators';

// `multipart/form-data` has no native nested-object support here, so the
// client sends `location` as a JSON-encoded string field, parsed via
// `@Transform` before `@ValidateNested` runs.
export class CreateTicketLocationDTO {
  @ApiProperty()
  @IsUUID()
  building_id!: string;

  @ApiProperty()
  @IsUUID()
  environment_id!: string;
}

export class CreateTicketDTO {
  @ApiProperty({ description: 'Descrição do problema em linguagem natural' })
  @IsString()
  @MaxLength(2000)
  description!: string;

  @ApiProperty({
    type: 'string',
    description:
      'Enviado em multipart/form-data como uma string JSON, ex.: {"building_id":"...","environment_id":"..."}',
  })
  // Must return a class instance: `@Type` has already run on the raw string,
  // so a plain object here would carry no validation metadata and
  // `whitelist` would strip every field. Invalid JSON is passed through so
  // `@ValidateNested` rejects it with a 400 instead of a 500.
  @Transform(({ value }: { value: unknown }) => {
    if (typeof value !== 'string') return value;
    try {
      return plainToInstance(CreateTicketLocationDTO, JSON.parse(value) as object);
    } catch {
      return value;
    }
  })
  @ValidateNested()
  @Type(() => CreateTicketLocationDTO)
  location!: CreateTicketLocationDTO;

  @ApiProperty({ description: 'UUID do setor sugerido pela classificação automática' })
  @IsUUID()
  automatic_sector_id!: string;

  @ApiProperty({ description: 'UUID do setor confirmado/escolhido pelo solicitante' })
  @IsUUID()
  confirmed_sector_id!: string;

  // Not a real DTO field: documented here only so Swagger renders the
  // `photos` file-array input. Files themselves arrive via
  // `FilesInterceptor('photos')` + `@UploadedFiles()`, never through
  // class-validator.
  @ApiProperty({
    type: 'array',
    items: { type: 'string', format: 'binary' },
    required: false,
    description: 'Fotos opcionais (evidência visual - nunca usadas na classificação, RB-02)',
  })
  photos?: unknown;
}
