import { describe, expect, it } from 'vitest';
import { loadDataset } from '../src/dataset/loader.js';
import { stratifiedSplit } from '../src/dataset/split.js';
const SECTOR_IDS = ['TI', 'Secretaria Acadêmica', 'Financeiro', 'Biblioteca', 'Infraestrutura'];

describe('dataset', () => {
  it('carrega o dataset padrão validado de 10.000 registros', async () => { expect((await loadDataset()).length).toBe(10_000); });
  it('faz split reproduzível, estratificado e sem interseções', async () => {
    const data = await loadDataset();
    const first = stratifiedSplit(data, 123);
    const second = stratifiedSplit(data, 123);
    expect(first).toEqual(second);
    expect(first.train.length / data.length).toBeGreaterThan(0.79);
    expect(first.train.length / data.length).toBeLessThan(0.81);
    expect(first.validation.length + first.test.length).toBe(data.length - first.train.length);
    for (const subset of [first.train, first.validation, first.test]) {
      expect(new Set(subset.map((item) => item.sectorId))).toEqual(new Set(SECTOR_IDS));
    }
    expect(new Set([...first.train, ...first.validation, ...first.test].map((item) => item.originalText)).size).toBe(10_000);
    const ownership = new Map<string, string>();
    for (const [name, subset] of Object.entries(first)) for (const item of subset) {
      expect(ownership.get(item.groupId) ?? name).toBe(name);
      ownership.set(item.groupId, name);
    }
  });
});
