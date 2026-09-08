import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';

import { IsString, IsUUID, MaxLength } from '@shared/validators';

// `location` is a nested object in endpoints-sinaliza.md §8.1, but
// `multipart/form-data` has no native nested-object support (no bracket
// notation is wired up in this project's body parser). Implementation
// decision: the client sends it as a single form field whose value is a
// JSON-encoded string (e.g. `location={"building_id":"...","environment_id":"..."}`),
// parsed here via `@Transform` before `@ValidateNested` runs — every other
// field (`description`, `automatic_sector_id`, `confirmed_sector_id`) travels
// as an ordinary flat multipart text field.
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
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? JSON.parse(value) : value,
  )
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
    description: 'Fotos opcionais (evidência visual — nunca usadas na classificação, RB-02)',
  })
  photos?: unknown;
}
