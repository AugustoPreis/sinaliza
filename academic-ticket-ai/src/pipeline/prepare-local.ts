import { mkdir } from 'node:fs/promises';
import { AI_CONFIG } from '../config/ai.js';
import { generateBalancedDataset, writeDataset } from '../dataset/generator.js';
import { prepareValidatedDataset } from '../dataset/workflow.js';
import { calculateMetrics } from '../evaluation/metrics.js';
import { FileSectorProvider } from '../sectors/provider.js';
import type { TrainingMetadataInput } from '../shared/types.js';
import { writeJson } from '../shared/utils.js';
import { predictWithTfidf, saveTfidfModel, trainTfidfModel } from '../tfidf/model.js';
import { createRunId } from './run.js';

// Comparação local por grupos: o relato real de aceitação não participa deste fluxo.
const sectors = await new FileSectorProvider(AI_CONFIG.mockSectorConfigPath).getActiveSectors();
await writeDataset(AI_CONFIG.mockDatasetPath, generateBalancedDataset(sectors));
const dataset = await prepareValidatedDataset();
// A menor variante reduz saudações e contexto sintético sem consultar rótulos de avaliação.
const byGroup = new Map<string, (typeof dataset.records)[number]>();
for (const record of dataset.split.train) {
  const current = byGroup.get(record.groupId);
  if (!current || record.originalText.length < current.originalText.length) byGroup.set(record.groupId, record);
}
const representatives = [...byGroup.values()];
const runId = createRunId();
const directory = `${AI_CONFIG.modelRoot}/${runId}`;
await mkdir(directory, { recursive: false });
const provenance: TrainingMetadataInput = {
  modelVersion: runId, datasetVersion: dataset.version, datasetPath: dataset.path, datasetHash: dataset.hash,
  datasetTotalSamples: dataset.records.length, trainSamples: representatives.length,
  validationSamples: dataset.split.validation.length, testSamples: dataset.split.test.length,
  modelType: 'tfidf-centroid', sectorIds: sectors.map(sector => sector.id), sectorCount: sectors.length,
  seed: AI_CONFIG.seed, dataSource: 'MOCK',
};
const candidates = [
  { id: 'centroid-word', mode: 'word' as const, algorithm: 'centroid' as const, count: 1 },
  { id: 'centroid-char', mode: 'char' as const, algorithm: 'centroid' as const, count: 1 },
  { id: 'centroid-combined', mode: 'combined' as const, algorithm: 'centroid' as const, count: 1 },
  { id: 'nearest-example', mode: 'word' as const, algorithm: 'centroid' as const, count: representatives.length },
  { id: 'random-forest', mode: 'word' as const, algorithm: 'random-forest' as const, count: 1 },
];
const results = [];
for (const candidate of candidates) {
  console.log(`Avaliando ${candidate.id} com ${representatives.length} representantes de treino...`);
  const model = await trainTfidfModel(representatives.map(record => record.originalText), representatives.map(record => record.sectorId),
    candidate.mode, false, provenance, candidate.count, candidate.algorithm);
  model.metadata.configuration = { ...model.metadata.configuration, sampling: 'shortest-per-training-group', split: AI_CONFIG.split,
    trainGroupIds: representatives.map(record => record.groupId), selection: candidate.id };
  const predictions = await Promise.all(dataset.split.validation.map(record => predictWithTfidf(model, record.originalText)));
  const metrics = calculateMetrics(dataset.split.validation.map(record => record.sectorId), predictions.map(prediction => prediction.sectorId), provenance.sectorIds);
  console.log(`${candidate.id}: macro-F1 validação=${metrics.macroF1.toFixed(4)}`);
  const path = `${directory}/${candidate.id}.json`;
  await saveTfidfModel(path, model);
  results.push({ id: candidate.id, path, metrics, model });
}
results.sort((a, b) => b.metrics.macroF1 - a.metrics.macroF1);
const selected = results[0]!;
const predicted = await Promise.all(dataset.split.test.map(record => predictWithTfidf(selected.model, record.originalText)));
const testMetrics = calculateMetrics(dataset.split.test.map(record => record.sectorId), predicted.map(prediction => prediction.sectorId), provenance.sectorIds);
selected.model.metadata.metrics = { accuracy: testMetrics.accuracy, macroF1: testMetrics.macroF1, weightedF1: testMetrics.weightedF1 };
await saveTfidfModel(selected.path, selected.model);
const reportPath = `${AI_CONFIG.reportRoot}/${runId}/pipeline.json`;
await writeJson(reportPath, {
  runId, dataSource: 'MOCK', scope: 'local-group-representatives',
  dataset: { path: dataset.path, version: dataset.version, hash: dataset.hash, validation: dataset.validation },
  split: { train: representatives.length, availableTrain: dataset.split.train.length, validation: dataset.split.validation.length, test: dataset.split.test.length, groupLeakage: 0 },
  selectionCriterion: 'validation-macro-F1', validationResults: results.map(({ model: _model, ...result }) => result),
  testMetrics, modelPath: selected.path,
});
await writeJson(`${AI_CONFIG.modelRoot}/latest.json`, { runId, modelPath: selected.path, reportPath });
console.log(`Selecionado: ${selected.id}; teste MOCK accuracy=${testMetrics.accuracy.toFixed(4)}, macro-F1=${testMetrics.macroF1.toFixed(4)}.`);
console.log(`Relatório: ${reportPath}`);
