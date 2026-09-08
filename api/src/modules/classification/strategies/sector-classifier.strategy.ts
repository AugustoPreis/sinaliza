import { SectorEntity } from '@modules/sectors/entities/sector.entity';

// DI token: inject with `@Inject(SECTOR_CLASSIFIER_STRATEGY)`. Anything that
// creates a ticket (Phase 3) resolves the automatic sector through this
// interface, never through a concrete strategy class directly — swapping the
// classification algorithm is then just registering a different provider for
// this token in `ClassificationModule`.
export const SECTOR_CLASSIFIER_STRATEGY = Symbol('SECTOR_CLASSIFIER_STRATEGY');

export interface IClassificationResult {
  sector: SectorEntity;
  // Optional by design — endpoints-sinaliza.md §7.1/§21 point 9: a
  // confidence score is not a functional requirement, only surfaced when the
  // concrete strategy can produce one.
  confidence?: number;
}

export interface SectorClassifierStrategy {
  // RB-02: `description` is the ONLY input. Callers must never pass photo
  // content/URLs into this method.
  classify(description: string, sectors: SectorEntity[]): Promise<IClassificationResult>;
}
