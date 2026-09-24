import { mkdir } from 'node:fs/promises';
import { prepareValidatedDataset } from '../dataset/workflow.js';
import { loadMinilmModel, saveMinilmModel, trainMinilmModel, predictWithMinilm } from '../minilm/model.js';
import type { Prediction, TfidfMode, TrainingMetadataInput } from '../shared/types.js';
import { fileSize, writeJson } from '../shared/utils.js';
import { loadTfidfModel, saveTfidfModel, trainTfidfModel, predictWithTfidf } from '../tfidf/model.js';
import { calculateMetrics } from './metrics.js';
import { AI_CONFIG } from '../config/ai.js';

const experiments: Array<{ id: string; mode?: TfidfMode; spell?: boolean }> = [
  { id: 'word', mode: 'word' }, { id: 'char', mode: 'char' },
  { id: 'combined', mode: 'combined' }, { id: 'nspell', mode: 'word', spell: true }, { id: 'minilm' },
];
const ratios = { train: 0.7, validation: 0.15, test: 0.15 };
type Predictor = (text: string) => Promise<Prediction>;
async function evaluate(records: Awaited<ReturnType<typeof prepareValidatedDataset>>['records'], predict: Predictor, ids: string[]) {
  const labels: string[] = [];
  const durations: number[] = [];
  // Warm-up is separate from measured, sequential end-to-end inference latency.
  if (records[0]) await predict(records[0].originalText);
  for (const item of records) {
    const start = performance.now();
    labels.push((await predict(item.originalText)).sectorId);
    durations.push(performance.now() - start);
  }
  const sorted = [...durations].sort((a, b) => a - b);
  return { metrics: calculateMetrics(records.map(item => item.sectorId), labels, ids),
    latency: { meanMs: durations.reduce((a, b) => a + b, 0) / durations.length, p95Ms: sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))] } };
}

async function run(): Promise<void> {
  const onlyIndex = process.argv.indexOf('--only');
  const only = onlyIndex < 0 ? undefined : process.argv[onlyIndex + 1];
  if (onlyIndex >= 0 && !experiments.some(item => item.id === only)) throw new Error('Use --only word|char|combined|nspell|minilm.');
  const selected = only ? experiments.filter(item => item.id === only) : experiments;
  const dataset = await prepareValidatedDataset(AI_CONFIG.mockDatasetPath, ratios);
  const { validation, test } = dataset.split;
  const quick = process.argv.includes('--quick');
  const train = quick ? [...new Set(dataset.records.map(item => item.sectorId))].flatMap(id => dataset.split.train.filter(item => item.sectorId === id).slice(0, 250)) : dataset.split.train;
  const ids = [...new Set(dataset.records.map(item => item.sectorId))];
  for (const part of [train, validation, test]) if (ids.some(id => !part.some(item => item.sectorId === id))) throw new Error('Split sem todas as classes.');
  const runId = `comparison-${new Date().toISOString().replace(/[:.]/g, '-')}`;
  const directory = `${AI_CONFIG.modelRoot}/${runId}`;
  const reportPath = `${AI_CONFIG.reportRoot}/${runId}.json`;
  await mkdir(directory, { recursive: true });
  const provenance: TrainingMetadataInput = {
    modelVersion: runId, datasetVersion: dataset.version, datasetPath: dataset.path, datasetHash: dataset.hash,
    datasetTotalSamples: dataset.records.length, trainSamples: train.length, validationSamples: validation.length,
    testSamples: test.length, modelType: 'random-forest', sectorIds: ids, sectorCount: ids.length, seed: AI_CONFIG.seed, dataSource: 'MOCK',
  };
  const manifest = Object.fromEntries((['train', 'validation', 'test'] as const).map(part => [part, [...new Set(dataset.split[part].map(item => item.groupId))]]));
  const report = { runId, dataSource: 'MOCK', datasetHash: dataset.hash, requestedSplit: ratios,
    samples: { train: train.length, availableTrain: dataset.split.train.length, validation: validation.length, test: test.length }, groupIds: manifest,
    scope: quick ? 'quick: at most 250 existing training records per sector; validation and test unchanged' : 'full: all training records',
    algorithm: 'random-forest', parameters: AI_CONFIG.randomForest,
    methodology: 'Fixed parameters. Select by validation macro-F1; evaluate the selected model once on test. Existing MOCK data has been explored historically; test is not an independent real-world holdout.',
    status: 'running', validationResults: [] as Array<Record<string, unknown>>, selectedModel: '', finalTest: undefined as unknown,
  };
  await writeJson(reportPath, report);
  const candidates: Array<{ id: string; macroF1: number; path: string }> = [];
  for (const experiment of selected) {
    console.log(`Treinando ${experiment.id} + Random Forest real...`);
    try {
      const start = performance.now();
      const artifact = experiment.mode
        ? await trainTfidfModel(train.map(item => item.originalText), train.map(item => item.sectorId), experiment.mode, experiment.spell, provenance)
        : await trainMinilmModel(train.map(item => item.originalText), train.map(item => item.sectorId), provenance);
      const trainingMs = performance.now() - start;
      artifact.metadata.configuration.split = ratios;
      if (!artifact.classifier.model || artifact.classifier.centroids) throw new Error('Esperado Random Forest real.');
      const path = `${directory}/${experiment.id}.json`;
      let predict: Predictor;
      if ('vectorizer' in artifact) {
        await saveTfidfModel(path, artifact);
        const loaded = await loadTfidfModel(path);
        predict = text => predictWithTfidf(loaded, text);
      } else {
        await saveMinilmModel(path, artifact);
        const loaded = await loadMinilmModel(path);
        predict = text => predictWithMinilm(loaded, text);
      }
      const result = await evaluate(validation, predict, ids);
      report.validationResults.push({ id: experiment.id, status: 'passed', path, trainingMs, modelBytes: await fileSize(path), ...result });
      candidates.push({ id: experiment.id, macroF1: result.metrics.macroF1, path });
      console.log(`${experiment.id}: macro-F1 validação ${result.metrics.macroF1.toFixed(4)}`);
    } catch (error) {
      report.validationResults.push({ id: experiment.id, status: 'failed', error: error instanceof Error ? error.message : String(error) });
      console.error(`Experimento ${experiment.id} falhou; detalhes no relatório.`);
    }
    await writeJson(reportPath, report);
  }
  if (candidates.length === selected.length) {
    const best = candidates.reduce((a, b) => b.macroF1 > a.macroF1 ? b : a);
    report.selectedModel = best.path;
    const model = best.id === 'minilm' ? await loadMinilmModel(best.path) : await loadTfidfModel(best.path);
    report.finalTest = await evaluate(test, text => 'vectorizer' in model ? predictWithTfidf(model, text) : predictWithMinilm(model, text), ids);
    report.status = only ? 'single-experiment-complete' : quick ? 'quick-complete' : 'complete';
  } else { report.status = 'incomplete'; process.exitCode = 1; }
  await writeJson(reportPath, report);
  console.log(`Relatório: ${reportPath}. Estado: ${report.status}. Artefatos anteriores preservados.`);
}
run().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
