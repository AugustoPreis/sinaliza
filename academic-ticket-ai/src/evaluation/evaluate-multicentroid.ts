import { prepareValidatedDataset } from '../dataset/workflow.js';
import { trainTfidfModel, predictWithTfidf } from '../tfidf/model.js';
import { calculateMetrics } from './metrics.js';
const data = await prepareValidatedDataset();
const representatives = [...new Set(data.split.train.map((r) => r.groupId))].map((g) => data.split.train.find((r) => r.groupId === g)!);
const model = await trainTfidfModel(representatives.map((r) => r.originalText), representatives.map((r) => r.sectorId), 'word', false, undefined, 2, 'centroid');
const predictions = await Promise.all(data.split.test.map((r) => predictWithTfidf(model, r.originalText)));
const metrics = calculateMetrics(data.split.test.map((r) => r.sectorId), predictions.map((p) => p.sectorId));
console.log(JSON.stringify(metrics, null, 2));
