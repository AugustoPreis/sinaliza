import { SectorEntity } from '@modules/sectors/entities/sector.entity';

// DI token: inject with `@Inject(SECTOR_CLASSIFIER_STRATEGY)` so consumers
// depend on `ISectorClassifierStrategy`, not a concrete strategy class.
export const SECTOR_CLASSIFIER_STRATEGY = Symbol('SECTOR_CLASSIFIER_STRATEGY');

export interface IClassificationResult {
  sector: SectorEntity;
  // Optional: only surfaced when the concrete strategy can produce one.
  confidence?: number;
}

export interface ISectorClassifierStrategy {
  // RB-02: `description` is the ONLY input — never photo content/URLs.
  classify(description: string, sectors: SectorEntity[]): Promise<IClassificationResult>;
}
