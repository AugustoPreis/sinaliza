import type { RandomForestArtifact } from '../random-forest/classifier.js';
import { rankSectors, type SemanticReference } from './scoring.js';
export function hybridRanking(vector: number[], embedding: number[], classifier: RandomForestArtifact,
  references: SemanticReference[], neighbors: number, weight: number) {
  if (!classifier.centroids || classifier.centroids.length !== classifier.classes.length) throw new Error('Modelo híbrido exige um centroide por setor.');
  const semantic = rankSectors(embedding, references, classifier.classes, neighbors);
  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1;
  return classifier.classes.map((sectorId, index) => {
    const lexical = classifier.centroids![index]!.reduce((sum, value, feature) => sum + value * vector[feature]! / norm, 0);
    const semanticScore = semantic.find(item => item.sectorId === sectorId)!.score;
    return { sectorId, score: Math.max(0, weight * semanticScore + (1 - weight) * lexical), semanticScore };
  }).sort((a, b) => b.score - a.score);
}

export interface HybridConfiguration {
  transformerModel: string;
  transformerRevision: string;
  neighbors: number;
  weight: number;
  minimumSemanticScore: number;
  minimumMargin: number;
  references: SemanticReference[];
}
export function reviewDecision(rows: ReturnType<typeof hybridRanking>, config: HybridConfiguration) {
  const best = rows[0]!;
  const margin = best.score - (rows[1]?.score ?? 0);
  const semanticWinner = [...rows].sort((a, b) => b.semanticScore - a.semanticScore)[0]!;
  if (best.semanticScore < config.minimumSemanticScore) return 'insufficient_context';
  if (semanticWinner.sectorId !== best.sectorId) return 'model_disagreement';
  if (margin < config.minimumMargin) return 'close_scores';
  return undefined;
}
