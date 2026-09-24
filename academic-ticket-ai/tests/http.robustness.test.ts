import { beforeAll, afterAll, expect, it } from 'vitest';
import type { Server } from 'node:http';
import { createClassificationServer } from '../src/http/server.js';
import { defaultModel } from '../src/models/default.js';
let server: Server;
let url: string;
const token = 'robustness-local-token-for-http-test';
beforeAll(async () => {
  const model = await defaultModel();
  server = await createClassificationServer({ AI_MODE: 'mock', AI_MODEL_TYPE: model.modelType, AI_MODEL_PATH: model.modelPath, AI_SERVICE_TOKEN: token, AI_SECTOR_SOURCE: 'mock-file' });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  url = `http://127.0.0.1:${(server.address() as { port: number }).port}/classification/preview`;
}, 120_000);
afterAll(async () => { if (server?.listening) { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); } });
const cases = [
  ['o projetorr da sala nao mostra a imagem do notebook pelo cabo HDMI', 'TI'],
  ['paguei a menssalidade por pix faz tres dias mas o boleto continua em aberto no portal', 'Financeiro'],
  ['preciso renovar o emprestimo do livro, ainda estou lendo para fazer meu trabalho', 'Biblioteca'],
  ['preciso de uma declaracao de matricula para apresentar no trabalho', 'Secretaria Acadêmica'],
  ['o ar condicionado da sala parou de gelar e ficou pingando agua no chao', 'Infraestrutura'],
  [`${'Hoje chegamos cedo para organizar a atividade e conversamos com os colegas sobre os preparativos. '.repeat(12)} O problema que preciso resolver é o projetor: conectamos o notebook pelo cabo HDMI, mas a imagem não aparece na tela.`, 'TI'],
];
it.each(cases)('classifica pela API e retorna metadados auditáveis: %s', async (description, expected) => {
  const response = await fetch(url, { method: 'POST', headers: { authorization: `Bearer ${token}` }, body: JSON.stringify({ description }) });
  expect(response.status).toBe(200);
  const result = await response.json() as any;
  expect(result.automatic_sector.id).toBe(expected);
  expect(result.classification).toMatchObject({ schema_version: 1, data_source: 'MOCK', score_type: 'uncalibrated_score', model: result.model });
  expect(result.classification.model_version).toBeTruthy();
  expect(result.classification.request_id).toMatch(/^[a-f\d-]{36}$/);
  expect(typeof result.classification.requires_review).toBe('boolean');
  if (description.length > 400) expect(result.classification.processing.semantic_chunks).toBeGreaterThan(1);
  if (description.includes('menssalidade')) expect(result.classification.processing.corrected_tokens).toBeGreaterThan(0);
}, 120_000);
