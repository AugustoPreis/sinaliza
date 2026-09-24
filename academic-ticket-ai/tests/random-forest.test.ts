import { describe, expect, it } from 'vitest';
import { RandomForestClassifier } from '../src/random-forest/classifier.js';
const SECTOR_IDS = ['TI', 'Secretaria Acadêmica', 'Financeiro', 'Biblioteca'];

describe('Random Forest', () => {
  it('persiste, carrega e retorna probabilidade por votação', () => {
    const classifier = new RandomForestClassifier(SECTOR_IDS, { nEstimators: 20 });
    classifier.train([[0, 0], [0, 0.1], [1, 1], [0.9, 1]], ['TI', 'TI', 'Financeiro', 'Financeiro']);
    const restored = RandomForestClassifier.fromArtifact(JSON.parse(JSON.stringify(classifier.toArtifact())));
    const [prediction] = restored.predict([[0, 0]]);
    expect(prediction?.sectorId).toBe('TI');
    expect(prediction?.confidence).toBeGreaterThanOrEqual(0);
    expect(prediction?.confidence).toBeLessThanOrEqual(1);
  });

  it('persiste múltiplos centroides e mantém predição reproduzível', () => {
    const classifier = new RandomForestClassifier(['TI', 'Biblioteca'], { algorithm: 'centroid', nEstimators: 5, centroidsPerClass: 2 });
    classifier.train([[1, 0], [0.9, 0.1], [0, 1], [0.1, 0.9]], ['TI', 'TI', 'Biblioteca', 'Biblioteca']);
    const artifact = classifier.toArtifact();
    expect(artifact.centroids).toHaveLength(4);
    const restored = RandomForestClassifier.fromArtifact(JSON.parse(JSON.stringify(artifact)));
    expect(restored.predict([[0.95, 0.05]])[0]?.sectorId).toBe('TI');
    expect(restored.predict([[0.05, 0.95]])[0]?.sectorId).toBe('Biblioteca');
  });
});

it('reports cosine similarity instead of unconditional confidence 1', () => {
  const model = new RandomForestClassifier(['a', 'b'], { algorithm: 'centroid', nEstimators: 5 });
  model.train([[1, 0], [0, 1]], ['a', 'b']);
  expect(model.predict([[1, 0]])[0]?.confidence).toBeCloseTo(1);
  expect(model.predict([[1, 1]])[0]?.confidence).toBeCloseTo(Math.SQRT1_2);
  expect(model.predict([[0, 0]])[0]?.confidence).toBe(0);
});

it('uses actual Random Forest even with only one tree', () => {
  const classifier = new RandomForestClassifier(['a', 'b'], { nEstimators: 1 });
  classifier.train([[0,0],[0,0.1],[1,1],[1,0.9]], ['a','a','b','b']);
  const artifact = classifier.toArtifact();
  expect(artifact.model).toBeDefined();
  expect(artifact.centroids).toBeUndefined();
  expect(RandomForestClassifier.fromArtifact(JSON.parse(JSON.stringify(artifact))).predict([[1,1]])).toEqual(classifier.predict([[1,1]]));
});

it('loads historical centroids without relabeling them as Random Forest', () => {
  const legacy = { classes: ['a', 'b'], centroids: [[1, 0], [0, 1]], options: { nEstimators: 5, maxFeatures: 0, seed: 42, maxDepth: 10, centroidsPerClass: 1 } };
  const loaded = RandomForestClassifier.fromArtifact(legacy as Parameters<typeof RandomForestClassifier.fromArtifact>[0]);
  expect(loaded.toArtifact().options.algorithm).toBe('centroid');
  expect(loaded.predict([[0, 1]])[0]?.sectorId).toBe('b');
});
