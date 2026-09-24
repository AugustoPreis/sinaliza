import type { EvaluationMetrics, SectorId } from '../shared/types.js';

export function confusionMatrix(actual: SectorId[], predicted: SectorId[], classIds = [...new Set([...actual, ...predicted])]): number[][] {
  if (actual.length !== predicted.length) throw new Error('Rótulos reais e previstos possuem tamanhos diferentes.');
  const matrix = classIds.map(() => classIds.map(() => 0));
  for (let index = 0; index < actual.length; index++) {
    const row = classIds.indexOf(actual[index]!);
    const column = classIds.indexOf(predicted[index]!);
    if (row < 0 || column < 0) throw new Error('Classe inválida ao gerar matriz de confusão.');
    matrix[row]![column]! += 1;
  }
  return matrix;
}

export function calculateMetrics(actual: SectorId[], predicted: SectorId[], classIds = [...new Set([...actual, ...predicted])]): EvaluationMetrics {
  if (actual.length === 0) throw new Error('Não é possível calcular métricas sem amostras.');
  const matrix = confusionMatrix(actual, predicted, classIds);
  const perClass = Object.fromEntries(classIds.map((sector, classIndex) => {
    const truePositive = matrix[classIndex]![classIndex]!;
    const support = matrix[classIndex]!.reduce((sum, value) => sum + value, 0);
    const predictedCount = matrix.reduce((sum, row) => sum + row[classIndex]!, 0);
    const precision = predictedCount ? truePositive / predictedCount : 0;
    const recall = support ? truePositive / support : 0;
    const f1 = precision + recall ? (2 * precision * recall) / (precision + recall) : 0;
    return [sector, { precision, recall, f1, support }];
  })) as EvaluationMetrics['perClass'];
  const correct = classIds.reduce((sum, _, index) => sum + matrix[index]![index]!, 0);
  const macroF1 = classIds.reduce((sum, sector) => sum + perClass[sector]!.f1, 0) / classIds.length;
  const weightedF1 = classIds.reduce((sum, sector) => sum + perClass[sector]!.f1 * perClass[sector]!.support, 0) / actual.length;
  return { accuracy: correct / actual.length, macroF1, weightedF1, perClass, confusionMatrix: matrix, classIds };
}
