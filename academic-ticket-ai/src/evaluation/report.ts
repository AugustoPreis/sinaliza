import type { EvaluationMetrics } from '../shared/types.js';
import { formatConfusionMatrix } from './confusion-matrix.js';

export function printEvaluation(metrics: EvaluationMetrics): void {
  console.log(`Accuracy: ${(metrics.accuracy * 100).toFixed(2)}%`);
  console.log(`Macro-F1: ${(metrics.macroF1 * 100).toFixed(2)}%`);
  console.log(`Weighted-F1: ${(metrics.weightedF1 * 100).toFixed(2)}%`);
  console.table(Object.entries(metrics.perClass).map(([sector, value]) => ({
    setor: sector, precision: value.precision.toFixed(3), recall: value.recall.toFixed(3),
    f1: value.f1.toFixed(3), suporte: value.support,
  })));
  console.log(formatConfusionMatrix(metrics.confusionMatrix, metrics.classIds));
}
