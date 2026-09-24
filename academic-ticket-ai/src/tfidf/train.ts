import { pathToFileURL } from 'node:url';
import { mkdir } from 'node:fs/promises';
import { AI_CONFIG } from '../config/ai.js';
import type { TfidfMode, TrainingMetadataInput } from '../shared/types.js';
import { saveTfidfModel, trainTfidfModel } from './model.js';
import { prepareValidatedDataset } from '../dataset/workflow.js';
import { createRunId } from '../pipeline/run.js';

function option(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

export async function trainTfidfCli(): Promise<void> {
  const mode = (option('--mode') ?? 'word') as TfidfMode;
  if (!['word', 'char', 'combined'].includes(mode)) throw new Error(`Modo TF-IDF inválido: ${mode}`);
  const spell = process.argv.includes('--spell');
  const dataset = await prepareValidatedDataset();
  const { train, validation, test } = dataset.split;
  const runId = createRunId();
  const provenance: TrainingMetadataInput = { modelVersion: runId, datasetVersion: dataset.version, datasetPath: dataset.path, datasetHash: dataset.hash,
    dataSource: 'MOCK', datasetTotalSamples: dataset.records.length, trainSamples: train.length, validationSamples: validation.length, testSamples: test.length,
    modelType: 'tfidf-random-forest', sectorIds: [...new Set(dataset.records.map((item) => item.sectorId))], sectorCount: new Set(dataset.records.map((item) => item.sectorId)).size, seed: AI_CONFIG.seed };
  const started = performance.now();
  const artifact = await trainTfidfModel(train.map((item) => item.originalText), train.map((item) => item.sectorId), mode, spell, provenance);
  const directory = `${AI_CONFIG.modelRoot}/${runId}`;
  await mkdir(directory, { recursive: false });
  const path = option('--output') ?? `${directory}/${artifact.modelName}.json`;
  await saveTfidfModel(path, artifact);
  console.log(`Modelo salvo em ${path} (${(performance.now() - started).toFixed(0)} ms).`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) trainTfidfCli().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
