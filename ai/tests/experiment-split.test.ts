import { expect, it } from 'vitest';
import { stratifiedSplit, assertNoGroupLeakage } from '../src/dataset/split.js';

it('uses 70/15/15 groups reproducibly without altering source records', () => {
  const records = ['a', 'b'].flatMap(sectorId => Array.from({ length: 20 }, (_, index) => ({ originalText: `${sectorId} unique ${index}`, sectorId, groupId: `${sectorId}-${index}`, sourceExampleId: `${sectorId}-${index}` })));
  const before = JSON.stringify(records);
  const ratios = { train: 0.7, validation: 0.15, test: 0.15 };
  const split = stratifiedSplit(records, 42, ratios);
  expect([split.train.length, split.validation.length, split.test.length]).toEqual([28, 6, 6]);
  expect(split).toEqual(stratifiedSplit(records, 42, ratios));
  expect(() => assertNoGroupLeakage(split)).not.toThrow();
  expect(JSON.stringify(records)).toBe(before);
  expect(() => stratifiedSplit(records, 42, { train: 0.8, validation: 0.2, test: 0.2 })).toThrow();
});

it('records split ratios separately from the frozen dataset', async () => {
  const { storedSplit } = await import('../src/dataset/split.js');
  expect(storedSplit({ split: { train: 0.7, validation: 0.15, test: 0.15 } })).toEqual({ train: 0.7, validation: 0.15, test: 0.15 });
  expect(storedSplit({})).toEqual({ train: 0.8, validation: 0.1, test: 0.1 });
  expect(() => storedSplit({ split: {} })).toThrow();
});
