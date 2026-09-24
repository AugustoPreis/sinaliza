import { mkdir } from 'node:fs/promises';
import { AI_CONFIG } from '../config/ai.js';
import { generateBalancedDataset, writeDataset } from '../dataset/generator.js';
import { prepareValidatedDataset } from '../dataset/workflow.js';
import { calculateMetrics } from '../evaluation/metrics.js';
import { FileSectorProvider } from '../sectors/provider.js';
import type { TrainingMetadataInput } from '../shared/types.js';
import { writeJson } from '../shared/utils.js';
import { predictWithTfidf, saveTfidfModel, trainTfidfModel } from '../tfidf/model.js';

export function createRunId(now = new Date()): string { return `v-${now.toISOString().replace(/[:.]/g, '-').replace('T', '_').replace('Z', '')}`; }

export async function runPipeline(): Promise<{ runId: string; modelPath: string; reportPath: string }> {
  const sectors = await new FileSectorProvider(AI_CONFIG.mockSectorConfigPath).getActiveSectors();
  console.log(`Gerando dataset ${AI_CONFIG.datasetVersion} com ${AI_CONFIG.datasetSize} registros...`);
  await writeDataset(AI_CONFIG.mockDatasetPath, generateBalancedDataset(sectors, AI_CONFIG.datasetSize));
  const dataset = await prepareValidatedDataset();
  const runId = createRunId();
  const runDirectory = `${AI_CONFIG.modelRoot}/${runId}`;
  await mkdir(runDirectory, { recursive: false });
  const provenance: TrainingMetadataInput = {
    modelVersion: runId, datasetVersion: dataset.version, datasetPath: dataset.path, datasetHash: dataset.hash,
    datasetTotalSamples: dataset.records.length, trainSamples: dataset.split.train.length,
    validationSamples: dataset.split.validation.length, testSamples: dataset.split.test.length,
    modelType: 'tfidf-random-forest', sectorIds: sectors.map((sector) => sector.id), sectorCount: sectors.length, seed: AI_CONFIG.seed,
    dataSource: 'MOCK',
  };
  console.log(`Treinando ${provenance.modelType} ${runId}...`);
  const model = await trainTfidfModel(dataset.split.train.map((item) => item.originalText), dataset.split.train.map((item) => item.sectorId), 'word', false, provenance);
  const predict = async (records: typeof dataset.split.validation) => Promise.all(records.map((item) => predictWithTfidf(model, item.originalText)));
  const validationPredictions = await predict(dataset.split.validation);
  const validationMetrics = calculateMetrics(dataset.split.validation.map((item) => item.sectorId), validationPredictions.map((item) => item.sectorId), provenance.sectorIds);
  const testPredictions = await predict(dataset.split.test);
  const testMetrics = calculateMetrics(dataset.split.test.map((item) => item.sectorId), testPredictions.map((item) => item.sectorId), provenance.sectorIds);
  model.metadata.metrics = { accuracy: testMetrics.accuracy, macroF1: testMetrics.macroF1, weightedF1: testMetrics.weightedF1 };
  const modelPath = `${runDirectory}/tfidf-word-rf.json`;
  const reportPath = `${AI_CONFIG.reportRoot}/${runId}/pipeline.json`;
  await saveTfidfModel(modelPath, model);
  await writeJson(reportPath, { runId, dataset: { path: dataset.path, version: dataset.version, hash: dataset.hash, validation: dataset.validation }, split: {
    train: dataset.split.train.length, validation: dataset.split.validation.length, test: dataset.split.test.length, groupLeakage: 0,
  }, validationMetrics, testMetrics, modelPath });
  await writeJson(`${AI_CONFIG.modelRoot}/latest.json`, { runId, modelPath, reportPath });
  console.log(`Pipeline concluído: ${modelPath}`);
  return { runId, modelPath, reportPath };
}

if (process.argv[1]?.endsWith('/run.ts') || process.argv[1]?.endsWith('/run.js')) runPipeline().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
