import { prepareValidatedDataset } from '../dataset/workflow.js';
import { trainTfidfModel, predictWithTfidf } from '../tfidf/model.js';
import { calculateMetrics } from './metrics.js';
import { writeJson } from '../shared/utils.js';

const dataset = await prepareValidatedDataset();
const groups = [...new Set(dataset.records.map((r) => r.groupId))];
const byGroup = new Map(groups.map((g) => [g, dataset.records.filter((r) => r.groupId === g)]));
const folds = Array.from({ length: 5 }, () => ({ train: [] as typeof dataset.records, validation: [] as typeof dataset.records }));
for (const sector of [...new Set(dataset.records.map((r) => r.sectorId))]) {
  const sectorGroups = groups.filter((g) => byGroup.get(g)![0]!.sectorId === sector);
  sectorGroups.forEach((g, i) => folds[i % folds.length]!.validation.push(...byGroup.get(g)!));
  for (let f = 0; f < folds.length; f++) for (let i = 0; i < sectorGroups.length; i++) if (i % folds.length !== f) folds[f]!.train.push(...byGroup.get(sectorGroups[i]!)!);
}
const results: Array<{ fold: number; centroidsPerClass: number; trainGroups: number; validationGroups: number; metrics: ReturnType<typeof calculateMetrics> }> = [];
for (const centroidsPerClass of [1, 2, 3, 4]) for (let i = 0; i < folds.length; i++) {
  const fold = folds[i]!;
  const representatives = [...new Set(fold.train.map((r) => r.groupId))].map((groupId) => fold.train.find((r) => r.groupId === groupId)!);
  const model = await trainTfidfModel(representatives.map((r) => r.originalText), representatives.map((r) => r.sectorId), 'word', false, undefined, centroidsPerClass);
  const predictions = await Promise.all(fold.validation.map((r) => predictWithTfidf(model, r.originalText)));
  results.push({ fold: i + 1, centroidsPerClass, trainGroups: new Set(fold.train.map((r) => r.groupId)).size, validationGroups: new Set(fold.validation.map((r) => r.groupId)).size, metrics: calculateMetrics(fold.validation.map((r) => r.sectorId), predictions.map((p) => p.sectorId)) });
}
const summaries = [1,2,3,4].map((k) => { const selected = results.filter((r) => r.centroidsPerClass === k); const macro = selected.map((r) => r.metrics.macroF1); const mean = macro.reduce((a,b)=>a+b,0)/macro.length; const sd = Math.sqrt(macro.reduce((a,b)=>a+(b-mean)**2,0)/macro.length); const sectors = [...new Set(dataset.records.map((r) => r.sectorId))]; return { centroidsPerClass:k, macroF1Mean:mean, macroF1StdDev:sd, macroF1Min:Math.min(...macro), macroF1Max:Math.max(...macro), meanF1BySector:Object.fromEntries(sectors.map((s) => [s, selected.reduce((sum,r)=>sum+r.metrics.perClass[s]!.f1,0)/selected.length])) }; });
const sectors = [...new Set(dataset.records.map((r) => r.sectorId))];
const report = { generatedAt: new Date().toISOString(), folds: results, summaries };
await writeJson('reports/group-cross-validation.json', report); console.log(JSON.stringify(report.summaries, null, 2));
