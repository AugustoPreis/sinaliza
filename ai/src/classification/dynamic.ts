import { semanticEmbeddings, SEMANTIC_MODEL, SEMANTIC_REVISION } from '../semantic/embeddings.js';
import { descriptionChunks } from '../preprocessing/description.js';

export interface Candidate { id: string; name: string; categories: string[] }
export type Embedder = (texts: string[]) => Promise<number[][]>;
export interface Policy { minimumScore: number; minimumMargin: number }
export function effectiveMinimumScore(policy: Policy, candidateCount: number): number {
  const competingCandidates = Math.max(1, candidateCount - 1);
  const scarcityPenalty = candidateCount < 4 ? policy.minimumMargin / (competingCandidates ** 2) : 0;
  return Math.min(1, policy.minimumScore + scarcityPenalty);
}
export function validCandidates(value: unknown): value is Candidate[] {
  if (!Array.isArray(value) || !value.length || value.length > 500) return false;
  const ids = new Set<string>();
  return value.every((item: unknown) => {
    if (!item || typeof item !== 'object') return false;
    const c = item as Candidate;
    if (Object.keys(c).some(k => !['id', 'name', 'categories'].includes(k)) ||
      typeof c.id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(c.id) || ids.has(c.id) ||
      typeof c.name !== 'string' || !c.name.trim() || c.name.length > 255 ||
      !Array.isArray(c.categories) || c.categories.length > 100 ||
      c.categories.some(t => typeof t !== 'string' || !t.trim() || t.length > 255)) return false;
    ids.add(c.id); return true;
  });
}
export async function rankCandidates(description: string, candidates: Candidate[], embed: Embedder = semanticEmbeddings) {
  const documents = [description.normalize('NFKC').trim(), ...candidates.map(c => [c.name, ...c.categories].join('. '))];
  const groups = documents.map(text => descriptionChunks(text));
  const vectors = await embed(groups.flat());
  let offset = 0;
  const pooled = groups.map(chunks => {
    const vector = Array<number>(vectors[0]!.length).fill(0);
    for (const chunk of chunks) {
      const embedding = vectors[offset++]!;
      for (let j = 0; j < vector.length; j++) vector[j]! += embedding[j]! * chunk.length;
    }
    const norm = Math.hypot(...vector);
    return vector.map(x => norm ? x / norm : 0);
  });
  const query = pooled[0]!;
  return candidates.map((c, i) => {
    const vector = pooled[i + 1]!;
    const score = Math.max(0, Math.min(1, query.reduce((sum, x, j) => sum + x * vector[j]!, 0)));
    return { id: c.id, name: c.name, score };
  }).sort((a,b) => b.score - a.score);
}

export async function classifyDynamic(description: string, candidates: Candidate[], policy: Policy, embed: Embedder = semanticEmbeddings) {
  if (!description.trim() || description.length > 2000 || !validCandidates(candidates)) throw new Error('INVALID_REQUEST');
  const ranked = await rankCandidates(description, candidates, embed);
  const top = ranked[0]!;
  const margin = top.score - (ranked[1]?.score ?? 0);
  const minimumScore = effectiveMinimumScore(policy, candidates.length);
  const short = (description.match(/[\p{L}\p{N}]+/gu) ?? []).length < 3;
  const reason = short ? 'insufficient_context' : top.score < minimumScore ? 'insufficient_context' : margin < policy.minimumMargin ? 'close_scores' : null;
  return {
    sector_id: reason ? null : top.id,
    automatic_sector: reason ? null : { id: top.id, name: top.name },
    confidence: top.score,
    dataSource: 'REAL' as const,
    model: SEMANTIC_MODEL,
    classification: {
      schema_version: 1 as const, request_id: crypto.randomUUID(), model: SEMANTIC_MODEL,
      model_version: SEMANTIC_REVISION, method: 'dynamic-semantic-cosine-v1',
      data_source: 'REAL' as const, score_type: 'uncalibrated_score' as const,
      requires_review: reason !== null, review_reason: reason,
      alternatives: ranked.slice(0, 3),
      decision: { minimum_score: minimumScore, minimum_margin: policy.minimumMargin, margin },
    },
  };
}
