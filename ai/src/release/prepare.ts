import { mkdir, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { AI_CONFIG } from '../config/ai.js';
import { loadTfidfModel } from '../tfidf/model.js';
import { loadMinilmModel } from '../minilm/model.js';
import { writeJson } from '../shared/utils.js';
import type { EvaluationMetrics } from '../shared/types.js';
import { writeFile } from 'node:fs/promises';

interface ExperimentResult { id: string; status: string; path: string; metrics: EvaluationMetrics; trainingMs: number; latency: { meanMs: number; p95Ms: number }; modelBytes: number }
async function main(): Promise<void> {
  const path = process.argv[2];
  if (!path) throw new Error('Uso: npm run release:prepare -- reports/comparison-....json');
  const report = JSON.parse(await readFile(path, 'utf8')) as {
    status: string; datasetHash: string; selectedModel: string; scope: string;
    requestedSplit: { train: number; validation: number; test: number };
    samples: { train: number; availableTrain: number; validation: number; test: number };
    validationResults: ExperimentResult[]; finalTest: { metrics: EvaluationMetrics };
  };
  const hash = createHash('sha256').update(await readFile(AI_CONFIG.mockDatasetPath)).digest('hex');
  if (!['complete', 'quick-complete'].includes(report.status) || report.datasetHash !== hash || report.validationResults.length !== 5 || new Set(report.validationResults.map(item => item.id)).size !== 5 || report.validationResults.some(item => item.status !== 'passed')) {
    throw new Error('Entrega exige os cinco experimentos concluídos e hash do dataset correspondente.');
  }
  const selected = report.validationResults.find(item => item.path === report.selectedModel);
  if (!selected) throw new Error('Modelo selecionado não pertence ao relatório.');
  await mkdir('models/release/experiments', { recursive: true });
  for (const item of report.validationResults) {
    if (!['word', 'char', 'combined', 'nspell', 'minilm'].includes(item.id)) throw new Error('Experimento inválido.');
    const model = item.id === 'minilm' ? await loadMinilmModel(item.path) : await loadTfidfModel(item.path);
    if (model.metadata.dataSource !== 'MOCK' || model.metadata.datasetHash !== hash || !model.classifier.model || model.classifier.centroids) throw new Error('Origem/algoritmo do modelo incompatível.');
    // The run report is authoritative for the exact split used in this experiment.
    model.metadata.configuration.split = report.requestedSplit;
    await writeJson(`models/release/experiments/${item.id}.json`, model);
    if (item.id === selected.id) await writeJson('models/release/selected.json', model);
  }
  await writeJson('models/release/comparison.json', report);
  await writeJson('models/release/manifest.json', { modelPath: 'models/release/selected.json', modelType: selected.id === 'minilm' ? 'minilm' : 'tfidf',
    experimentScope: report.status, selectedExperiment: selected.id, dataSource: 'MOCK', reportPath: 'models/release/comparison.json', datasetHash: hash,
    experiments: report.validationResults.map(item => ({ id: item.id, path: `models/release/experiments/${item.id}.json` })),
  });
  const lines = [ '# Resultados da IA — dados MOCK', '',
    `Escopo: **${report.status}**. Treino usado: ${report.samples.train} de ${report.samples.availableTrain} disponíveis; validação: ${report.samples.validation}; teste: ${report.samples.test}.`, '',
    'Não são resultados de produção. Não houve ajuste de parâmetros em busca de melhores métricas.', '',
    '| Modelo (RF) | Accuracy validação | Macro-F1 validação | Treino (s) | Latência média (ms) |',
    '|---|---:|---:|---:|---:|',
    ...report.validationResults.map(item => `| ${item.id} | ${(item.metrics.accuracy * 100).toFixed(2)}% | ${item.metrics.macroF1.toFixed(4)} | ${(item.trainingMs / 1000).toFixed(1)} | ${item.latency.meanMs.toFixed(2)} |`), '',
    `Selecionado pela validação: **${selected.id}**. Accuracy no teste: **${(report.finalTest.metrics.accuracy * 100).toFixed(2)}%**; macro-F1 no teste: **${report.finalTest.metrics.macroF1.toFixed(4)}**.`, '',
    'Métricas por setor e matriz de confusão estão em comparison.json. A pontuação retornada pela API não é probabilidade calibrada. O histórico de exploração deste MOCK limita as conclusões sobre generalização.',
  ];
  await writeFile('models/release/RESULTADOS.md', `${lines.join('\n')}\n`);
  console.log('Entrega preparada. Teste: npm run predict -- "descrição" ou npm run demo:http.');
}
main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
