// TODO: placeholder classifier - keyword overlap between the description's
// tokens and each sector's `categories` tags. Replace with a real
// model/embeddings classifier by implementing `ISectorClassifierStrategy` and
// swapping the provider bound to `SECTOR_CLASSIFIER_STRATEGY`.
import { Injectable } from '@nestjs/common';

import { SectorEntity } from '@modules/sectors/entities/sector.entity';

import { IClassificationResult, ISectorClassifierStrategy } from './sector-classifier.strategy';

@Injectable()
export class KeywordSectorClassifierStrategy implements ISectorClassifierStrategy {
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
    // dedicated "fallback sector" flag on `SectorEntity` - every sector is an
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
