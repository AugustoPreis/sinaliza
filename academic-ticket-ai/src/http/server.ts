import { createServer } from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import { ClassificationPreviewService } from '../classification/service.js';
import { aiRuntimeMode, assertModelDataSourceAllowed } from '../config/runtime.js';
import { BackendSectorProvider, FileSectorProvider } from '../sectors/provider.js';
import { loadMinilmModel, predictWithMinilm } from '../minilm/model.js';
import { loadTfidfModel, predictWithTfidf } from '../tfidf/model.js';

export async function createClassificationServer(env: NodeJS.ProcessEnv = process.env) {
  const mode = aiRuntimeMode(env);
  const token = env.AI_SERVICE_TOKEN;
  if (!token || token.length < 32) throw new Error('AI_SERVICE_TOKEN deve conter pelo menos 32 caracteres.');
  let service: ClassificationPreviewService | undefined;
  let dataSource: 'MOCK' | 'REAL' | undefined;
  if (mode !== 'disabled') {
    if (!env.AI_MODEL_PATH) throw new Error('AI_MODEL_PATH é obrigatório.');
    const sectorSource = env.AI_SECTOR_SOURCE ?? 'backend';
    if (!['backend', 'mock-file'].includes(sectorSource)) throw new Error('AI_SECTOR_SOURCE inválido.');
    if (sectorSource === 'mock-file' && mode !== 'mock') throw new Error('MOCK_SECTORS_NOT_ALLOWED');
    if (sectorSource === 'backend' && (!env.BACKEND_API_URL || !env.BACKEND_API_TOKEN)) throw new Error('BACKEND_API_URL e BACKEND_API_TOKEN são obrigatórios.');
    const type = env.AI_MODEL_TYPE ?? 'tfidf';
    if (!['tfidf', 'minilm'].includes(type)) throw new Error('AI_MODEL_TYPE inválido: use tfidf ou minilm.');
    const artifact = type === 'minilm' ? await loadMinilmModel(env.AI_MODEL_PATH) : await loadTfidfModel(env.AI_MODEL_PATH);
    dataSource = artifact.metadata.dataSource;
    assertModelDataSourceAllowed(dataSource, mode, env);
    const ids = artifact.metadata.sectorIds;
    const classes = artifact.classifier.classes;
    if (new Set(ids).size !== ids.length || ids.length !== classes.length || classes.some(id => !ids.includes(id))) {
      throw new Error('MODEL_SECTORS_INCOMPATIBLE: metadata e classes divergem.');
    }
    service = new ClassificationPreviewService({
      modelSectorIds: ids,
      classify: description => 'vectorizer' in artifact ? predictWithTfidf(artifact, description) : predictWithMinilm(artifact, description),
    }, sectorSource === 'mock-file'
      ? new FileSectorProvider('config/sectors.mock.json')
      : new BackendSectorProvider(env.BACKEND_API_URL!, fetch, { token: env.BACKEND_API_TOKEN, timeoutMs: Number(env.BACKEND_TIMEOUT_MS ?? 3000) }));
  }
  const expected = Buffer.from(`Bearer ${token}`);
  return createServer(async (request, response) => {
    const send = (status: number, body: unknown) => {
      response.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' });
      response.end(JSON.stringify(body));
    };
    if (request.method !== 'POST' || request.url !== '/classification/preview') return send(404, { code: 'NOT_FOUND' });
    const auth = Buffer.from(request.headers.authorization ?? '');
    if (auth.length !== expected.length || !timingSafeEqual(auth, expected)) return send(401, { code: 'UNAUTHORIZED' });
    if (!service) return send(503, { code: 'CLASSIFICATION_DISABLED' });
    let body: unknown;
    try {
      let size = 0;
      const chunks: Buffer[] = [];
      for await (const chunk of request) {
        size += Buffer.byteLength(chunk);
        if (size > 16384) { send(413, { code: 'PAYLOAD_TOO_LARGE' }); return; }
        chunks.push(Buffer.from(chunk));
      }
      body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    } catch { return send(400, { code: 'INVALID_REQUEST' }); }
    if (!body || typeof body !== 'object' || Array.isArray(body) ||
        Object.keys(body).some(key => key !== 'description') ||
        !('description' in body) || typeof body.description !== 'string' ||
        !body.description.trim() || body.description.length > 2000) return send(400, { code: 'INVALID_REQUEST' });
    try {
      send(200, { ...await service.preview({ description: body.description }), dataSource });
    } catch (error) {
      const incompatible = error instanceof Error && error.message.startsWith('MODEL_SECTORS_INCOMPATIBLE:');
      send(incompatible ? 409 : 503, { code: incompatible ? 'MODEL_SECTORS_INCOMPATIBLE' : 'CLASSIFICATION_UNAVAILABLE' });
    }
  });
}
