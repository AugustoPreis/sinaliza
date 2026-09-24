import { createHash } from 'node:crypto';
import { mkdir, readFile } from 'node:fs/promises';
import { AI_CONFIG } from '../config/ai.js';
import { prepareValidatedDataset } from '../dataset/workflow.js';
import { calculateMetrics } from '../evaluation/metrics.js';
import { loadTfidfModel, predictWithTfidf, saveTfidfModel, trainTfidfModel } from '../tfidf/model.js';
import { TfidfVectorizer } from '../tfidf/vectorizer.js';
import { normalizeText } from '../preprocessing/normalize.js';
import { hybridRanking, reviewDecision } from '../semantic/hybrid.js';
import { SEMANTIC_MODEL, SEMANTIC_REVISION } from '../semantic/embeddings.js';
import { latestModelPath } from '../models/latest.js';
import { writeJson } from '../shared/utils.js';
import type { TfidfMode, TrainingMetadataInput } from '../shared/types.js';
import { createRunId } from './run.js';

const dataset = await prepareValidatedDataset();
const validationReport = JSON.parse(await readFile('reports/hybrid-validation.json', 'utf8')) as {
  datasetHash: string; cachePath: string; results: Array<{ mode: TfidfMode; neighbors: number; weight: number; metrics: ReturnType<typeof calculateMetrics> }>;
};
if (validationReport.datasetHash !== dataset.hash) throw new Error('Validação desatualizada. Execute benchmark:hybrid.');
const selected = validationReport.results[0]!;
const byGroup = new Map<string, (typeof dataset.records)[number]>();
for (const record of dataset.records) {
  const current = byGroup.get(record.groupId);
  if (!current || record.originalText.length < current.originalText.length) byGroup.set(record.groupId, record);
}
const records = [...byGroup.values()];
const hash = createHash('sha256').update(JSON.stringify([SEMANTIC_MODEL, SEMANTIC_REVISION, records])).digest('hex');
if (validationReport.cachePath !== `.cache/semantic/${hash}.json`) throw new Error('Cache incompatível com os grupos de treino.');
const embeddings = JSON.parse(await readFile(validationReport.cachePath, 'utf8')) as number[][];
if (embeddings.length !== records.length) throw new Error('Cache incompleto.');
// Após selecionar parâmetros na validação, refaz o treino com treino+validação. Teste permanece excluído.
const testGroups = new Set(dataset.split.test.map(record => record.groupId));
const train = records.flatMap((record, index) => testGroups.has(record.groupId) ? [] : [{ ...record, vector: embeddings[index]! }]);
const test = records.flatMap((record, index) => testGroups.has(record.groupId) ? [{ ...record, vector: embeddings[index]! }] : []);
const runId = createRunId();
const directory = `${AI_CONFIG.modelRoot}/${runId}`;
await mkdir(directory, { recursive: false });
const classes = [...new Set(records.map(record => record.sectorId))];
const provenance: TrainingMetadataInput = { modelVersion: runId, datasetVersion: dataset.version, datasetPath: dataset.path, datasetHash: dataset.hash,
  datasetTotalSamples: dataset.records.length, trainSamples: train.length, validationSamples: 0, testSamples: test.length,
  modelType: 'tfidf-semantic', sectorIds: classes, sectorCount: classes.length, seed: AI_CONFIG.seed, dataSource: 'MOCK' };
const model = await trainTfidfModel(train.map(record => record.originalText), train.map(record => record.sectorId), selected.mode, false, provenance, 1, 'centroid');
model.modelName = 'tfidf-multilingual-minilm-hybrid';
model.metadata.modelType = 'tfidf-semantic';
model.metadata.dependencies['@huggingface/transformers'] = '4.x';
model.metadata.configuration = { ...model.metadata.configuration, algorithm: 'lexical-semantic-hybrid',
  selectionScope: '25 validation groups, parameters selected before final refit', finalFit: 'train-and-validation-groups',
  trainGroupIds: train.map(record => record.groupId), testGroupIds: test.map(record => record.groupId),
  datasetExploredPreviously: true };
model.semantic = { transformerModel: SEMANTIC_MODEL, transformerRevision: SEMANTIC_REVISION,
  neighbors: selected.neighbors, weight: selected.weight, minimumSemanticScore: 0.5, minimumMargin: 0.08,
  references: train.map(({ sectorId, vector }) => ({ sectorId, vector })) };
const features = TfidfVectorizer.fromArtifact(model.vectorizer).transform(test.map(record => normalizeText(record.originalText)));
const ranked = test.map((record, index) => hybridRanking(features[index]!, record.vector, model.classifier, model.semantic!.references, selected.neighbors, selected.weight));
const predictions = ranked.map(rows => rows[0]!.sectorId);
const metrics = calculateMetrics(test.map(record => record.sectorId), predictions, classes);
const reviewed = ranked.map(rows => Boolean(reviewDecision(rows, model.semantic!)));
const accepted = test.flatMap((record, index) => reviewed[index] ? [] : [{ expected: record.sectorId, predicted: predictions[index]! }]);
const reviewMetrics = { requiresReview: reviewed.filter(Boolean).length, total: test.length, accepted: accepted.length,
  acceptedAccuracy: accepted.length ? accepted.filter(row => row.expected === row.predicted).length / accepted.length : null };
const previousPath = await latestModelPath();
const previous = await loadTfidfModel(previousPath);
const baselinePredictions = await Promise.all(test.map(record => predictWithTfidf(previous, record.originalText)));
const baselineMetrics = calculateMetrics(test.map(record => record.sectorId), baselinePredictions.map(row => row.sectorId), classes);
model.metadata.metrics = { accuracy: metrics.accuracy, macroF1: metrics.macroF1, weightedF1: metrics.weightedF1 };
const modelPath = `${directory}/tfidf-semantic.json`;
const reportPath = `${AI_CONFIG.reportRoot}/${runId}/pipeline.json`;
await saveTfidfModel(modelPath, model);
await writeJson(reportPath, { runId, dataSource: 'MOCK', dataset: { path: dataset.path, hash: dataset.hash, version: dataset.version },
  scope: 'one-shortest-example-per-group; known synthetic dataset, not independent real data',
  split: { train: train.length, validation: 0, test: test.length, groupLeakage: 0 },
  selection: { ...selected, validationGroups: 25, initialTrainGroups: 200, refit: 'train + validation; no test groups' },
  modelPath, previousPath, baselineMetrics, testMetrics: metrics, reviewMetrics,
  predictions: test.map((record, index) => ({ groupId: record.groupId, expected: record.sectorId, predicted: predictions[index], requiresReview: reviewed[index] })),
});
// Qualidade do teste é registrada mesmo quando não melhora. Nunca rotular como 100% por esconder revisões.
if (metrics.macroF1 < baselineMetrics.macroF1) throw new Error(`Modelo não promovido: macro-F1 ${metrics.macroF1.toFixed(4)} abaixo do anterior ${baselineMetrics.macroF1.toFixed(4)}. Relatório: ${reportPath}`);
await writeJson('models/latest.json', { runId, modelPath, reportPath });
console.log(JSON.stringify({ modelPath, reportPath, samples: { train: train.length, test: test.length },
  baselineAccuracy: baselineMetrics.accuracy, accuracy: metrics.accuracy, macroF1: metrics.macroF1, reviewMetrics }, null, 2));
