import { ApiProperty } from '@nestjs/swagger';

export class AutomaticAccuracyDTO {
  @ApiProperty()
  total_tickets!: number;

  @ApiProperty()
  correct_without_any_correction!: number;

  @ApiProperty()
  percentage!: number;
}

export class CorrectionsDTO {
  @ApiProperty()
  by_requester!: number;

  @ApiProperty()
  by_sector!: number;
}

export class TimeToCorrectSectorDTO {
  @ApiProperty()
  average_minutes!: number;

  @ApiProperty()
  median_minutes!: number;
}

export class VolumeBySectorRowDTO {
  @ApiProperty()
  sector_id!: string;

  @ApiProperty()
  sector_name!: string;

  @ApiProperty()
  count!: number;
}

export class VolumeByCategoryRowDTO {
  @ApiProperty()
  category!: string;

  @ApiProperty()
  count!: number;
}

export class VolumeByLocationRowDTO {
  @ApiProperty()
  building_id!: string;

  @ApiProperty()
  building_name!: string;

  @ApiProperty()
  count!: number;
}

export class ResearchVolumeDTO {
  @ApiProperty({ type: [VolumeBySectorRowDTO] })
  by_sector!: VolumeBySectorRowDTO[];

  @ApiProperty({ type: [VolumeByCategoryRowDTO] })
  by_category!: VolumeByCategoryRowDTO[];

  @ApiProperty({ type: [VolumeByLocationRowDTO] })
  by_location!: VolumeByLocationRowDTO[];
}

// Built by `GetResearchIndicatorsUseCase` from `IResearchIndicatorsData` plus
// resolved sector/building name maps — see that use-case for the math
// (percentage/average/median) and the "what is a ticket's category" decision.
export class ResearchIndicatorsResponseDTO {
  @ApiProperty({ type: AutomaticAccuracyDTO })
  automatic_accuracy!: AutomaticAccuracyDTO;

  @ApiProperty({ type: CorrectionsDTO })
  corrections!: CorrectionsDTO;

  @ApiProperty({ type: TimeToCorrectSectorDTO })
  time_to_correct_sector!: TimeToCorrectSectorDTO;

  @ApiProperty({ type: ResearchVolumeDTO })
  volume!: ResearchVolumeDTO;
}
