import { trainTfidfModel } from '../tfidf/model.js';
import { TfidfVectorizer } from '../tfidf/vectorizer.js';
import { normalizeText } from '../preprocessing/normalize.js';
import { hybridRanking } from '../semantic/hybrid.js';
import { createHash } from 'node:crypto';
import { mkdir, readFile } from 'node:fs/promises';
import { prepareValidatedDataset } from '../dataset/workflow.js';
import { calculateMetrics } from './metrics.js';
import { writeJson } from '../shared/utils.js';
import { semanticEmbeddings, SEMANTIC_MODEL, SEMANTIC_REVISION } from '../semantic/embeddings.js';
import { rankSectors } from '../semantic/scoring.js';

const dataset = await prepareValidatedDataset();
const byGroup = new Map<string, (typeof dataset.records)[number]>();
for (const record of dataset.records) {
  const previous = byGroup.get(record.groupId);
  if (!previous || record.originalText.length < previous.originalText.length) byGroup.set(record.groupId, record);
}
const records = [...byGroup.values()];
const hash = createHash('sha256').update(JSON.stringify([SEMANTIC_MODEL, SEMANTIC_REVISION, records])).digest('hex');
await mkdir('.cache/semantic', { recursive: true });
const cachePath = `.cache/semantic/${hash}.json`;
let vectors: number[][];
try { vectors = JSON.parse(await readFile(cachePath, 'utf8')); }
catch (error) {
  if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  console.log(`Gerando embeddings locais de ${records.length} grupos distintos...`);
  vectors = await semanticEmbeddings(records.map(record => record.originalText));
  await writeJson(cachePath, vectors);
}
const parts = Object.fromEntries(Object.entries(dataset.split).map(([name, rows]) => {
  const ids = new Set((rows as typeof records).map(row => row.groupId));
  return [name, records.flatMap((record, i) => ids.has(record.groupId) ? [{ ...record, vector: vectors[i]! }] : [])];
}));
const classes = [...new Set(records.map(record => record.sectorId))];
const train = parts.train!;
const validation = parts.validation!;
const results = [1, 3, 5].map(neighbors => {
  const predicted = validation.map(record => rankSectors(record.vector, train, classes, neighbors)[0]!.sectorId);
  return { neighbors, metrics: calculateMetrics(validation.map(record => record.sectorId), predicted, classes),
    errors: validation.flatMap((record, index) => predicted[index] === record.sectorId ? [] : [{ text: record.originalText, expected: record.sectorId, predicted: predicted[index] }]) };
});
results.sort((a, b) => b.metrics.macroF1 - a.metrics.macroF1);
await writeJson('reports/semantic-validation.json', { datasetHash: dataset.hash, transformerModel: SEMANTIC_MODEL, transformerRevision: SEMANTIC_REVISION,
  samples: { train: train.length, validation: validation.length }, scope: 'shortest-per-group; test not evaluated', cachePath, results });
const hybridResults = [];
for (const mode of ['word', 'combined'] as const) {
  const lexical = await trainTfidfModel(train.map(record => record.originalText), train.map(record => record.sectorId), mode, false, undefined, 1, 'centroid');
  const features = TfidfVectorizer.fromArtifact(lexical.vectorizer).transform(validation.map(record => normalizeText(record.originalText)));
  for (const neighbors of [1, 3, 5]) for (const weight of [0, 0.25, 0.5, 0.75, 1]) {
    const ranked = validation.map((record, index) => hybridRanking(features[index]!, record.vector, lexical.classifier, train, neighbors, weight));
    const predicted = ranked.map(rows => rows[0]!.sectorId);
    hybridResults.push({ mode, neighbors, weight, metrics: calculateMetrics(validation.map(record => record.sectorId), predicted, classes),
      errors: validation.flatMap((record, index) => predicted[index] === record.sectorId ? [] : [{ text: record.originalText, expected: record.sectorId, predicted: predicted[index], scores: ranked[index] }]) });
  }
}
hybridResults.sort((a, b) => b.metrics.macroF1 - a.metrics.macroF1);
await writeJson('reports/hybrid-validation.json', { datasetHash: dataset.hash, transformerModel: SEMANTIC_MODEL, transformerRevision: SEMANTIC_REVISION,
  samples: { train: train.length, validation: validation.length }, scope: 'shortest-per-group; exploratory validation; test not evaluated', cachePath, results: hybridResults });
console.log(JSON.stringify(hybridResults.slice(0, 3), null, 2));
