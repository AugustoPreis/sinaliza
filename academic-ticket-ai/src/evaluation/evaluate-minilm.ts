import { prepareValidatedDataset } from '../dataset/workflow.js';
import { storedSplit } from '../dataset/split.js';
import { loadMinilmModel, predictWithMinilm } from '../minilm/model.js';
import { calculateMetrics } from './metrics.js';
import { printEvaluation } from './report.js';
import { AI_CONFIG } from '../config/ai.js';

async function main(): Promise<void> {
  const model = await loadMinilmModel(process.argv[2] ?? `${AI_CONFIG.modelRoot}/minilm/minilm-rf.json`);
  const dataset = await prepareValidatedDataset(model.metadata.datasetPath, storedSplit(model.metadata.configuration));
  if (model.metadata.datasetHash !== dataset.hash) throw new Error('O modelo não pertence ao dataset atualmente validado.');
  const actual: string[] = [], predicted: string[] = [];
  for (const record of dataset.split.test) { actual.push(record.sectorId); predicted.push((await predictWithMinilm(model, record.originalText)).sectorId); }
  printEvaluation(calculateMetrics(actual, predicted));
}
main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
