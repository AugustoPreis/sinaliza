import { pathToFileURL } from 'node:url';
import { mkdir } from 'node:fs/promises';
import { AI_CONFIG } from '../config/ai.js';
import { saveMinilmModel, trainMinilmModel } from './model.js';
import { prepareValidatedDataset } from '../dataset/workflow.js';
import { createRunId } from '../pipeline/run.js';
import type { TrainingMetadataInput } from '../shared/types.js';

async function main(): Promise<void> {
  const dataset = await prepareValidatedDataset();
  const { train, validation, test } = dataset.split;
  const runId = createRunId();
  const sectorIds = [...new Set(dataset.records.map((item) => item.sectorId))];
  const provenance: TrainingMetadataInput = { modelVersion: runId, datasetVersion: dataset.version, datasetPath: dataset.path, datasetHash: dataset.hash,
    dataSource: 'MOCK', datasetTotalSamples: dataset.records.length, trainSamples: train.length, validationSamples: validation.length, testSamples: test.length,
    modelType: 'minilm-random-forest', sectorIds, sectorCount: sectorIds.length, seed: AI_CONFIG.seed };
  const started = performance.now();
  const artifact = await trainMinilmModel(train.map((item) => item.originalText), train.map((item) => item.sectorId), provenance);
  const directory = `${AI_CONFIG.modelRoot}/${runId}`;
  await mkdir(directory, { recursive: false });
  const path = `${directory}/minilm-rf.json`;
  await saveMinilmModel(path, artifact);
  console.log(`Modelo salvo em ${path} (${(performance.now() - started).toFixed(0)} ms).`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
