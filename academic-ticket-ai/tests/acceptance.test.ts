import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import type { Server } from 'node:http';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { AI_CONFIG } from '../src/config/ai.js';
import { defaultModel } from '../src/models/default.js';
import { loadTfidfModel } from '../src/tfidf/model.js';
import { createClassificationServer } from '../src/http/server.js';
import { normalizeText } from '../src/preprocessing/normalize.js';
import { loadDataset } from '../src/dataset/loader.js';

const token = 'acceptance-local-service-token-123456';
let server: Server | undefined;
let url: string;
let modelPath: string;
beforeAll(async () => {
  const selected = await defaultModel();
  modelPath = selected.modelPath;
  server = await createClassificationServer({ AI_MODE: 'mock', AI_MODEL_TYPE: selected.modelType,
    AI_MODEL_PATH: modelPath, AI_SECTOR_SOURCE: 'mock-file', AI_SERVICE_TOKEN: token });
  await new Promise<void>(resolve => server!.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Porta indisponível.');
  url = `http://127.0.0.1:${address.port}/classification/preview`;
});
afterAll(async () => {
  if (server?.listening) {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server!.close(error => error ? reject(error) : resolve()));
  }
});
async function classify(description: string) {
  const response = await fetch(url, { method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ description }) });
  expect(response.status).toBe(200);
  return response.json();
}
it('1: modelo persistido e API categorizam os cinco setores do catálogo', async () => {
  const artifact = await loadTfidfModel(modelPath);
  expect(artifact.metadata.dataSource).toBe('MOCK');
  expect(artifact.metadata.datasetHash).toBe(createHash('sha256').update(await readFile(AI_CONFIG.mockDatasetPath)).digest('hex'));
  const cases = [
    ['não consigo acessar o portal', 'TI'],
    ['preciso de uma declaração de matrícula', 'Secretaria Acadêmica'],
    ['não recebi o boleto deste mês', 'Financeiro'],
    ['preciso renovar o empréstimo de um livro', 'Biblioteca'],
    ['a tomada da sala de aula não funciona', 'Infraestrutura'],
  ];
  expect(new Set(artifact.metadata.sectorIds)).toEqual(new Set(cases.map(([, sector]) => sector)));
  for (const [description, expected] of cases) {
    expect(await classify(description!)).toMatchObject({ automatic_sector: { id: expected }, dataSource: 'MOCK' });
  }
  if (artifact.semantic) expect(await classify('preciso de ajuda')).toMatchObject({ requires_review: true });
}, 120_000);
it('2: relato real de queda de energia vai para Infraestrutura, sem estar no dataset', async () => {
  // Relato fornecido pelo usuário. Regressão conhecida, não estimativa independente de acurácia.
  const descriptions = [
    'ah lembrei de um q aconteceu, sabe aquelas reguas de energia em sala de aula esses dias caiu tudo a energia da fileira na sala pq bateram naquela regua',
    'Na sala de aula, bateram na régua de energia e caiu toda a energia da fileira.',
  ];
  const records = await loadDataset();
  for (const description of descriptions) {
    expect(records.some(record => normalizeText(record.originalText).includes(normalizeText(description)))).toBe(false);
    expect(await classify(description)).toMatchObject({ automatic_sector: { id: 'Infraestrutura' } });
  }
}, 120_000);
