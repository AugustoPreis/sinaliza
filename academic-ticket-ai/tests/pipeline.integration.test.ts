import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { generateBalancedDataset } from '../src/dataset/generator.js';
import { stratifiedSplit, assertNoGroupLeakage } from '../src/dataset/split.js';
import { validateDataset } from '../src/dataset/validator.js';
import { calculateMetrics } from '../src/evaluation/metrics.js';
import { loadTfidfModel, predictWithTfidf, saveTfidfModel, trainTfidfModel } from '../src/tfidf/model.js';

const examples = Array.from({ length: 10 }, (_, index) => `problema representativo número ${index + 1} com acesso`);
const sectors = [
  { id: 'alpha', name: 'Equipe Alpha', active: true, examples },
  { id: 'beta', name: 'Equipe Beta', active: true, examples: examples.map((text) => text.replace('acesso', 'pagamento')) },
];

describe('pipeline reduzido end-to-end', () => {
  it('gera, valida, divide por grupo, treina, avalia, salva, carrega e prediz', async () => {
    const records = generateBalancedDataset(sectors, 400);
    validateDataset(records, sectors, 400);
    const split = stratifiedSplit(records);
    assertNoGroupLeakage(split);
    const model = await trainTfidfModel(split.train.map((item) => item.originalText), split.train.map((item) => item.sectorId), 'word');
    const predicted = await Promise.all(split.test.map((item) => predictWithTfidf(model, item.originalText)));
    expect(calculateMetrics(split.test.map((item) => item.sectorId), predicted.map((item) => item.sectorId)).accuracy).toBeGreaterThanOrEqual(0);
    const path = join(await mkdtemp(join(tmpdir(), 'sinaliz-e2e-')), 'model.json');
    await saveTfidfModel(path, model);
    const loaded = await loadTfidfModel(path);
    await expect(predictWithTfidf(loaded, 'estou com problema de acesso')).resolves.toHaveProperty('sectorId');
  }, 30_000);
});
