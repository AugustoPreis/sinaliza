import type { Prediction, SectorId } from '../shared/types.js';
import type { SectorProvider } from '../sectors/provider.js';
import { findNewSystemSectorIds } from '../sectors/provider.js';

export interface ClassifierService {
  readonly modelSectorIds: SectorId[];
  classify(description: string): Promise<Prediction>;
}

export interface ClassificationPreview { sector_id: SectorId; automatic_sector: { id: SectorId; name: string }; confidence?: number; model: string; requires_review?: boolean; review_reason?: string; alternatives?: Array<{ id: string; name: string; score: number }> }

export class ClassificationPreviewService {
  constructor(private readonly classifier: ClassifierService, private readonly sectors: SectorProvider) {}
  async preview(input: { description: string }): Promise<ClassificationPreview> {
    if (typeof input.description !== 'string' || !input.description.trim()) throw new Error('A descrição é obrigatória.');
    const active = await this.sectors.getActiveSectors();
    const newIds = findNewSystemSectorIds(active, this.classifier.modelSectorIds);
    if (newIds.length) throw new Error(`MODEL_SECTORS_INCOMPATIBLE: Há setores novos ainda desconhecidos pelo modelo; retreinamento necessário: ${newIds.join(', ')}`);
    const prediction = await this.classifier.classify(input.description.trim());
    if (!active.some((sector) => sector.id === prediction.sectorId)) throw new Error('O modelo retornou um setor que não está ativo no sistema.');
    const sector = active.find((item) => item.id === prediction.sectorId)!;
    return { sector_id: prediction.sectorId, automatic_sector: { id: sector.id, name: sector.name }, confidence: prediction.confidence, model: prediction.model,
      ...(prediction.requiresReview === undefined ? {} : { requires_review: prediction.requiresReview, review_reason: prediction.reviewReason,
        alternatives: prediction.alternatives?.flatMap(item => {
          const match = active.find(sector => sector.id === item.sectorId);
          return match ? [{ id: match.id, name: match.name, score: item.score }] : [];
        }) }) };
  }
}
