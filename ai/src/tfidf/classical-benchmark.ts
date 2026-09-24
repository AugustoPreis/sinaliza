import { performance } from 'node:perf_hooks';
import { loadDataset } from '../dataset/loader.js';
import { stratifiedSplit } from '../dataset/split.js';
import { calculateMetrics } from '../evaluation/metrics.js';
import { TfidfVectorizer } from './vectorizer.js';

type Kind = 'centroid' | 'logistic' | 'linearsvc' | 'sgd' | 'nb';
interface Model { predict(features: number[][]): { index: number; confidence: number }[] }
const dot = (a: number[], b: number[]) => a.reduce((s, x, i) => s + x * (b[i] ?? 0), 0);
const sparse = (row: number[]) => row.flatMap((value, index) => value === 0 ? [] : [[index, value] as [number, number]]);

function trainModel(kind: Kind, x: number[][], y: number[], classes: string[]): Model {
  const dimensions = x[0]?.length ?? 0;
  if (kind === 'centroid') {
    const centroids = classes.map((_, c) => { const rows = x.filter((_, i) => y[i] === c); const v = Array(dimensions).fill(0); for (const row of rows) row.forEach((n, i) => { v[i] += n; }); const norm = Math.hypot(...v) || 1; return v.map((n) => n / norm); });
    return { predict: (rows) => rows.map((row) => { const norm = Math.hypot(...row) || 1; const scores = centroids.map((c) => dot(c, row) / norm); const index = scores.indexOf(Math.max(...scores)); const min = Math.min(...scores), max = Math.max(...scores); return { index, confidence: max === min ? 1 : (max - min) / (Math.abs(max - min) + 1) }; }) };
  }
  if (kind === 'nb') {
    const counts = classes.map(() => Array(dimensions).fill(1)); const totals = classes.map(() => dimensions); const priors = classes.map((_, c) => y.filter((v) => v === c).length + 1);
    y.forEach((label, i) => x[i]!.forEach((value, j) => { counts[label]![j] = (counts[label]![j] ?? 0) + value; totals[label] = (totals[label] ?? 0) + value; }));
    return { predict: (rows) => rows.map((row) => { const scores = classes.map((_, c) => Math.log(priors[c]!) + row.reduce((s, v, j) => s + v * Math.log(counts[c]![j]! / totals[c]!), 0)); const index = scores.indexOf(Math.max(...scores)); return { index, confidence: scores[index]! }; }) };
  }
  const weights = classes.map(() => Array(dimensions).fill(0)); const logistic = kind === 'logistic' || kind === 'sgd'; const epochs = kind === 'linearsvc' ? 8 : 12;
  for (let epoch = 0; epoch < epochs; epoch++) for (let i = 0; i < x.length; i++) {
    const row = x[i]!, scores = weights.map((w) => dot(w, row)); const target = y[i]!;
    const active = sparse(row);
    if (logistic) { const max = Math.max(...scores); const exps = scores.map((s) => Math.exp(s - max)); const total = exps.reduce((a, b) => a + b, 0); weights.forEach((w, c) => active.forEach(([j, v]) => { w[j] += 0.05 * ((c === target ? 1 : 0) - exps[c]! / total) * v; })); }
    else { const index = scores.indexOf(Math.max(...scores)); if (index !== target) active.forEach(([j, v]) => { weights[target]![j] += 0.05 * v; weights[index]![j] -= 0.05 * v; }); }
  }
  return { predict: (rows) => rows.map((row) => { const scores = weights.map((w) => dot(w, row)); const index = scores.indexOf(Math.max(...scores)); return { index, confidence: scores[index]! }; }) };
}

async function main(): Promise<void> {
  const data = await loadDataset(); const split = stratifiedSplit(data); const classes = [...new Set(data.map((r) => r.sectorId))];
  const vectorizer = new TfidfVectorizer({ mode: 'combined' }); const trainTexts = split.train.map((r) => r.originalText); const trainX = vectorizer.fitTransform(trainTexts); const validationX = vectorizer.transform(split.validation.map((r) => r.originalText));
  const labels = split.train.map((r) => classes.indexOf(r.sectorId)); const actual = split.validation.map((r) => r.sectorId); const kinds: Kind[] = ['centroid', 'logistic', 'linearsvc', 'sgd', 'nb']; const results = [];
  for (const kind of kinds) { const started = performance.now(); const model = trainModel(kind, trainX, labels, classes); const trainMs = performance.now() - started; const predicted = model.predict(validationX).map((p) => classes[p.index]!); const metrics = calculateMetrics(actual, predicted, classes); results.push({ model: kind, trainMs: Math.round(trainMs), accuracy: metrics.accuracy, macroF1: metrics.macroF1, weightedF1: metrics.weightedF1, features: trainX[0]?.length ?? 0 }); }
  console.table(results); console.log(JSON.stringify({ methodology: 'same train/validation split; test reserved', results }, null, 2));
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
