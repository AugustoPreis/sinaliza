// TODO: this is a deliberate placeholder. `endpoints-sinaliza.md` §21 point 3
// leaves "tecnologia de classificação automática" as an open technical
// decision — a real model/embeddings/fine-tuned classifier is future work of
// the research project itself, out of scope for this MVP backend. What's
// implemented here is the simplest thing that satisfies the functional
// contract (text in, an existing sector out, RB-02 respected): a keyword
// overlap count between the description's tokens and each sector's
// `categories` tags. To replace it: implement `SectorClassifierStrategy`
// again and swap the provider bound to `SECTOR_CLASSIFIER_STRATEGY` in
// `ClassificationModule` — nothing else in the codebase should need to
// change, since Phase 3's ticket creation is expected to depend on the
// interface, not this class.
import { Injectable } from '@nestjs/common';

import { SectorEntity } from '@modules/sectors/entities/sector.entity';

import { IClassificationResult, SectorClassifierStrategy } from './sector-classifier.strategy';

@Injectable()
export class KeywordSectorClassifierStrategy implements SectorClassifierStrategy {
  // No async work happens here (it's a pure in-memory scoring pass), but the
  // interface returns a Promise so real strategies (an HTTP call to a model,
  // a DB-backed lookup...) can slot in without changing the contract.
  classify(description: string, sectors: SectorEntity[]): Promise<IClassificationResult> {
    const descriptionTokens = this.tokenize(description);

    const scored = sectors.map((sector) => ({
      sector,
      score: this.countOverlap(descriptionTokens, sector.categories ?? []),
    }));

    const bestScore = Math.max(...scored.map((entry) => entry.score));

    // No category matched any token at all: fall back to the first sector in
    // alphabetical order by name. Deterministic and doesn't require a
    // dedicated "fallback sector" flag on `SectorEntity` — every sector is an
    // equally valid target when the description gives no signal.
    if (bestScore <= 0) {
      return Promise.resolve({ sector: this.fallbackSector(sectors), confidence: 0 });
    }

    // Tie between two or more sectors with the same overlap count: same
    // deterministic rule, applied only to the tied candidates.
    const tied = scored.filter((entry) => entry.score === bestScore);
    const [chosen] = tied.sort((a, b) => a.sector.name.localeCompare(b.sector.name));

    const confidence = descriptionTokens.length
      ? Math.min(chosen.score / descriptionTokens.length, 1)
      : 0;

    return Promise.resolve({ sector: chosen.sector, confidence });
  }

  private fallbackSector(sectors: SectorEntity[]): SectorEntity {
    return [...sectors].sort((a, b) => a.name.localeCompare(b.name))[0];
  }

  private countOverlap(descriptionTokens: string[], categories: string[]): number {
    const categoryTokens = new Set(categories.flatMap((category) => this.tokenize(category)));

    return descriptionTokens.filter((token) => categoryTokens.has(token)).length;
  }

  // Lowercase, strip accents (NFD + combining-mark removal) and punctuation,
  // then split on whitespace.
  private tokenize(text: string): string[] {
    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(Boolean);
  }
}
