import { describe, expect, it } from 'vitest';
import { calculateMetrics } from '../src/evaluation/metrics.js';

describe('métricas', () => {
  it('calcula resultados multiclasse corretamente', () => {
    const actual = ['TI', 'TI', 'Financeiro', 'Biblioteca'] as const;
    const predicted = ['TI', 'Financeiro', 'Financeiro', 'Biblioteca'] as const;
    const metrics = calculateMetrics([...actual], [...predicted]);
    expect(metrics.accuracy).toBe(0.75);
    expect(metrics.perClass.TI?.recall).toBe(0.5);
    expect(metrics.perClass.Financeiro?.precision).toBe(0.5);
    expect(metrics.confusionMatrix.flat().reduce((sum, value) => sum + value, 0)).toBe(4);
  });
});
