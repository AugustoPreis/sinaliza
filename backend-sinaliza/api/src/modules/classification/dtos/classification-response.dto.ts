import { ClassificationDetails } from '../strategies/classification-details';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { SectorEntity } from '@modules/sectors/entities/sector.entity';

export class AutomaticSectorDTO {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  static from(entity: SectorEntity): AutomaticSectorDTO {
    const dto = new AutomaticSectorDTO();

    dto.id = entity.uuid;
    dto.name = entity.name;

    return dto;
  }
}

export class ClassificationAlternativeDTO extends AutomaticSectorDTO {
  @ApiProperty({ minimum: 0, maximum: 1 })
  score!: number;
}

export class ClassificationProcessingDTO {
  @ApiProperty()
  normalization!: string;

  @ApiProperty({ minimum: 0 })
  corrected_tokens!: number;

  @ApiProperty({ minimum: 1 })
  semantic_chunks!: number;
}

export class ClassificationDetailsDTO implements ClassificationDetails {
  @ApiProperty({ enum: [1] })
  schema_version!: 1;

  @ApiProperty()
  request_id!: string;

  @ApiProperty()
  model!: string;

  @ApiProperty()
  model_version!: string;

  @ApiProperty()
  method!: string;

  @ApiProperty({ enum: ['MOCK', 'REAL'] })
  data_source!: 'MOCK' | 'REAL';

  @ApiProperty({ enum: ['uncalibrated_score'] })
  score_type!: 'uncalibrated_score';

  @ApiProperty()
  requires_review!: boolean;

  @ApiProperty({
    type: String,
    nullable: true,
    enum: ['insufficient_context', 'model_disagreement', 'close_scores', 'uncalibrated_model'],
  })
  review_reason!: string | null;

  @ApiProperty({ type: [ClassificationAlternativeDTO] })
  alternatives!: ClassificationAlternativeDTO[];

  @ApiPropertyOptional({ type: ClassificationProcessingDTO })
  processing?: ClassificationProcessingDTO;
}

export class ClassificationResponseDTO {
  @ApiProperty({ type: AutomaticSectorDTO })
  automatic_sector!: AutomaticSectorDTO;

  @ApiPropertyOptional()
  confidence?: number;

  @ApiPropertyOptional({ type: ClassificationDetailsDTO })
  classification?: ClassificationDetailsDTO;

  static from(
    sector: SectorEntity,
    confidence?: number,
    classification?: ClassificationDetails,
  ): ClassificationResponseDTO {
    const dto = new ClassificationResponseDTO();

    dto.automatic_sector = AutomaticSectorDTO.from(sector);
    dto.confidence = confidence;
    if (classification) dto.classification = classification;

    return dto;
  }
}
