import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it, vi } from 'vitest';
import { hybridRanking, reviewDecision } from '../src/semantic/hybrid.js';
import { SEMANTIC_MODEL, SEMANTIC_REVISION } from '../src/semantic/embeddings.js';
import { loadTfidfModel, predictWithTfidf, saveTfidfModel, trainTfidfModel } from '../src/tfidf/model.js';
vi.mock('../src/semantic/embeddings.js', async importOriginal => {
  const original = await importOriginal<typeof import('../src/semantic/embeddings.js')>();
  return { ...original, semanticEmbeddings: vi.fn(async () => [Array.from({ length: 384 }, (_, index) => index === 0 ? 1 : 0)]) };
});
it('combina evidência semântica com lexical e sinaliza empate ou falta de contexto', () => {
  const classifier = { classes: ['a', 'b'], centroids: [[1, 0], [0, 1]], options: {} } as Parameters<typeof hybridRanking>[2];
  const references = [{ sectorId: 'a', vector: [1, 0] }, { sectorId: 'b', vector: [0, 1] }];
  const config = { transformerModel: SEMANTIC_MODEL, transformerRevision: SEMANTIC_REVISION, references,
    neighbors: 1, weight: 0.25, minimumSemanticScore: 0.5, minimumMargin: 0.08 };
  expect(hybridRanking([1, 0], [1, 0], classifier, references, 1, 0.25)[0]!.sectorId).toBe('a');
  expect(reviewDecision(hybridRanking([0, 0], [0, 0], classifier, references, 1, 0.25), config)).toBe('insufficient_context');
  expect(reviewDecision(hybridRanking([1, 1], [0.7, 0.7], classifier, references, 1, 0.25), config)).toBe('close_scores');
  expect(reviewDecision(hybridRanking([1, 0], [0.6, 0.8], classifier, references, 1, 0.25), config)).toBe('model_disagreement');
});
it('preserva o modelo híbrido serializado e rejeita revisão ou vetores incompatíveis', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'hybrid-model-'));
  try {
    const model = await trainTfidfModel(['senha acesso', 'livro reserva'], ['a', 'b'], 'word', false, undefined, 1, 'centroid');
    model.metadata.modelType = 'tfidf-semantic';
    model.modelName = 'tfidf-multilingual-minilm-hybrid';
    model.semantic = { transformerModel: SEMANTIC_MODEL, transformerRevision: SEMANTIC_REVISION, neighbors: 1, weight: 0.25,
      minimumSemanticScore: 0.5, minimumMargin: 0.08,
      references: model.classifier.classes.map((sectorId, c) => ({ sectorId, vector: Array.from({ length: 384 }, (_, i) => i === c ? 1 : 0) })) };
    const path = join(directory, 'model.json');
    await saveTfidfModel(path, model);
    const loaded = await loadTfidfModel(path);
    expect(await predictWithTfidf(loaded, 'senha acesso')).toMatchObject({ sectorId: 'a', requiresReview: false });
    model.semantic.transformerRevision = 'unknown';
    await saveTfidfModel(path, model);
    await expect(loadTfidfModel(path)).rejects.toThrow('híbrido');
    model.semantic.transformerRevision = SEMANTIC_REVISION;
    model.semantic.references[0]!.vector = [1];
    await saveTfidfModel(path, model);
    await expect(loadTfidfModel(path)).rejects.toThrow('híbrido');
  } finally { await rm(directory, { recursive: true, force: true }); }
});
