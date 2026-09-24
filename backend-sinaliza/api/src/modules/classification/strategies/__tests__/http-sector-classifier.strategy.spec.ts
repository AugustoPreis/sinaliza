import { createServer, Server } from 'node:http';

import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';

import { SectorEntity } from '@modules/sectors/entities/sector.entity';
import { SectorsRepository } from '@modules/sectors/repositories/sectors.repository';

import { ClassificationController } from '../../controllers/classification.controller';
import { PreviewClassificationUseCase } from '../../use-cases/preview-classification.use-case';
import { HttpSectorClassifierStrategy } from '../http-sector-classifier.strategy';
import { SECTOR_CLASSIFIER_STRATEGY } from '../sector-classifier.strategy';

const sector = { uuid: 'official-uuid', name: 'Nome no banco' } as SectorEntity;
let server: Server;
let url: string;
let status: number;
let payload: unknown;
let received: unknown;
let auth: string | undefined;
let stall: boolean;
beforeEach(async () => {
  status = 200;
  payload = {
    sector_id: sector.uuid,
    dataSource: 'REAL',
    confidence: 0.8,
    automatic_sector: { name: 'Untrusted' },
  };
  stall = false;
  server = createServer(async (req, res) => {
    if (stall) return;
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    received = JSON.parse(Buffer.concat(chunks).toString());
    auth = req.headers.authorization;
    res.writeHead(status, { 'content-type': 'application/json' });
    res.end(JSON.stringify(payload));
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  url = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
});
afterEach(async () => {
  server.closeAllConnections();
  await new Promise<void>((resolve) => server.close(() => resolve()));
});
function config(extra = {}): ConfigService {
  return new ConfigService({
    AI_MODE: 'trained',
    AI_SERVICE_URL: url,
    AI_SERVICE_TOKEN: 't'.repeat(32),
    AI_TIMEOUT_MS: 1000,
    ...extra,
  });
}
it('integrates Nest DI, controller, use case and HTTP with authoritative backend sector', async () => {
  const module = await Test.createTestingModule({
    controllers: [ClassificationController],
    providers: [
      PreviewClassificationUseCase,
      { provide: ConfigService, useValue: config() },
      { provide: SectorsRepository, useValue: { findAll: () => Promise.resolve([sector]) } },
      { provide: SECTOR_CLASSIFIER_STRATEGY, useClass: HttpSectorClassifierStrategy },
    ],
  }).compile();
  try {
    expect(
      await module.get(ClassificationController).preview({ description: 'computador sem rede' }),
    ).toEqual({ automatic_sector: { id: sector.uuid, name: sector.name }, confidence: 0.8 });
    expect(received).toEqual({ description: 'computador sem rede' });
    expect(auth).toBe(`Bearer ${'t'.repeat(32)}`);
  } finally {
    await module.close();
  }
});
it.each([
  [{ sector_id: 'unknown', dataSource: 'REAL' }, 'INVALID_CLASSIFICATION_SECTOR'],
  [{ sector_id: sector.uuid, dataSource: 'MOCK' }, 'MODEL_SOURCE_MISMATCH'],
  [{ sector_id: sector.uuid }, 'MODEL_SOURCE_MISMATCH'],
  [
    { sector_id: sector.uuid, dataSource: 'REAL', confidence: 2 },
    'INVALID_CLASSIFICATION_CONFIDENCE',
  ],
])('rejects invalid service results %j', async (body, error) => {
  payload = body;
  await expect(
    new HttpSectorClassifierStrategy(config()).classify('test', [sector]),
  ).rejects.toMatchObject({ code: error });
});
it('propagates model incompatibility without fallback', async () => {
  status = 409;
  payload = { code: 'MODEL_SECTORS_INCOMPATIBLE' };
  await expect(
    new HttpSectorClassifierStrategy(config()).classify('test', [sector]),
  ).rejects.toMatchObject({ code: 'MODEL_SECTORS_INCOMPATIBLE' });
});
it('handles timeout and authentication failure', async () => {
  status = 401;
  await expect(
    new HttpSectorClassifierStrategy(config()).classify('test', [sector]),
  ).rejects.toMatchObject({ code: 'CLASSIFICATION_UNAVAILABLE' });
  stall = true;
  await expect(
    new HttpSectorClassifierStrategy(config({ AI_TIMEOUT_MS: 20 })).classify('test', [sector]),
  ).rejects.toMatchObject({ code: 'CLASSIFICATION_UNAVAILABLE' });
});
it('defaults to disabled and blocks production mock', async () => {
  await expect(
    new HttpSectorClassifierStrategy(new ConfigService({})).classify('test', [sector]),
  ).rejects.toMatchObject({ code: 'CLASSIFICATION_DISABLED' });
  expect(
    () => new HttpSectorClassifierStrategy(config({ AI_MODE: 'mock', NODE_ENV: 'production' })),
  ).toThrow();
});

const details = () => ({
  schema_version: 1,
  request_id: 'e62c477d-1b11-4b4d-898d-1b18c7721e80',
  model: 'tfidf-multilingual-minilm-hybrid',
  model_version: 'test-model-v1',
  method: 'tfidf-semantic',
  data_source: 'REAL',
  score_type: 'uncalibrated_score',
  requires_review: true,
  review_reason: 'close_scores',
  alternatives: [{ id: sector.uuid, name: 'Nome não confiável', score: 0.4 }],
  processing: {
    normalization: 'unicode-whitespace-lowercase-v1',
    corrected_tokens: 1,
    semantic_chunks: 3,
  },
});
it('preserves structured decision through HTTP, use case and mobile DTO with official names', async () => {
  payload = {
    sector_id: sector.uuid,
    confidence: 0.4,
    dataSource: 'REAL',
    classification: details(),
  };
  const repository = { findAll: () => Promise.resolve([sector]) } as unknown as SectorsRepository;
  const useCase = new PreviewClassificationUseCase(
    repository,
    new HttpSectorClassifierStrategy(config()),
  );
  const description = 'o projetorr está sem imagem mesmo com HDMI conectado';
  const result = await useCase.execute({ description });
  expect(received).toEqual({ description });
  expect(result).toMatchObject({
    automatic_sector: { id: sector.uuid, name: sector.name },
    confidence: 0.4,
    classification: {
      ...details(),
      alternatives: [{ id: sector.uuid, name: sector.name, score: 0.4 }],
    },
  });
});
it.each([
  { schema_version: 2 },
  { requires_review: 'false' },
  { requires_review: false, review_reason: 'close_scores' },
  { alternatives: [{ id: 'unknown', score: 0.4 }] },
  { alternatives: [{ id: sector.uuid, score: 2 }] },
  { processing: { normalization: 'test', corrected_tokens: -1, semantic_chunks: 1 } },
])('rejects malformed decision metadata %j', async (override) => {
  payload = {
    sector_id: sector.uuid,
    dataSource: 'REAL',
    classification: { ...details(), ...override },
  };
  await expect(
    new HttpSectorClassifierStrategy(config()).classify('test', [sector]),
  ).rejects.toMatchObject({ code: 'INVALID_CLASSIFICATION_DETAILS' });
});
