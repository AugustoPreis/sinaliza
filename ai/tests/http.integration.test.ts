import { createServer, type Server } from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, expect, it } from 'vitest';
import { createClassificationServer } from '../src/http/server.js';
import { trainTfidfModel, saveTfidfModel } from '../src/tfidf/model.js';
import { aiRuntimeMode, assertModelDataSourceAllowed } from '../src/config/runtime.js';
import { BackendSectorProvider } from '../src/sectors/provider.js';

const token = 'test-service-token-'.repeat(3);
const servers: Server[] = [];
const directories: string[] = [];
async function listen(server: Server) {
  servers.push(server);
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Missing port');
  return `http://127.0.0.1:${address.port}`;
}
afterEach(async () => {
  await Promise.all(servers.splice(0).map(server => new Promise<void>((resolve, reject) => { server.closeAllConnections(); server.close(error => error ? reject(error) : resolve()); })));
  await Promise.all(directories.splice(0).map(path => rm(path, { recursive: true, force: true })));
});
it('runs authenticated HTTP preview with backend sectors and explicitly rejects new sectors', async () => {
  let items = [{ id: 'sector-a', name: 'Nome oficial' }];
  const backend = await listen(createServer((req, res) => {
    expect(req.url).toBe('/api/v1/sectors');
    expect(req.headers.cookie).toBe('access_token=backend-jwt');
    expect(req.headers.authorization).toBeUndefined();
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ success: true, data: { items }, timestamp: 'test' }));
  }));
  const dir = await mkdtemp(join(tmpdir(), 'sinaliza-http-')); directories.push(dir);
  const path = join(dir, 'model.json');
  const artifact = await trainTfidfModel(['computador quebrado', 'computador sem rede'], ['sector-a', 'sector-a'], 'word');
  await saveTfidfModel(path, artifact);
  const env = { AI_MODE: 'mock', AI_SERVICE_TOKEN: token, AI_MODEL_PATH: path, BACKEND_API_URL: `${backend}/api/v1`, BACKEND_API_TOKEN: 'backend-jwt' };
  const url = await listen(await createClassificationServer(env));
  const post = (body: unknown, auth = token) => fetch(`${url}/classification/preview`, { method: 'POST', headers: { authorization: `Bearer ${auth}` }, body: JSON.stringify(body) });
  expect((await post({ description: 'computador' }, 'wrong')).status).toBe(401);
  expect((await post({ description: 'computador', sector_id: 'sector-a' })).status).toBe(400);
  const result = await post({ description: 'computador sem rede' });
  expect(result.status).toBe(200);
  expect(await result.json()).toMatchObject({ sector_id: 'sector-a', automatic_sector: items[0], dataSource: 'MOCK' });
  items = [...items, { id: 'new-sector', name: 'Novo setor' }];
  const incompatible = await post({ description: 'computador' });
  expect(incompatible.status).toBe(409);
  expect(await incompatible.json()).toEqual({ code: 'MODEL_SECTORS_INCOMPATIBLE' });
  await expect(createClassificationServer({ ...env, AI_MODE: 'trained' })).rejects.toThrow('MOCK_MODEL_NOT_ALLOWED');
});
it('defaults to disabled and rejects production mock or unknown provenance', async () => {
  expect(aiRuntimeMode({})).toBe('disabled');
  expect(() => aiRuntimeMode({ AI_MODE: 'mock', NODE_ENV: 'production' })).toThrow('MOCK_MODEL_NOT_ALLOWED');
  expect(() => assertModelDataSourceAllowed(undefined as never, 'trained')).toThrow('MODEL_SOURCE_INVALID');
  const url = await listen(await createClassificationServer({ AI_SERVICE_TOKEN: token }));
  const response = await fetch(`${url}/classification/preview`, { method: 'POST', headers: { authorization: `Bearer ${token}` }, body: JSON.stringify({ description: 'computador' }) });
  expect(response.status).toBe(503);
});
it('times out backend sector requests and rejects duplicate ids', async () => {
  const url = await listen(createServer(() => {}));
  await expect(new BackendSectorProvider(url, fetch, { timeoutMs: 20 }).getActiveSectors()).rejects.toThrow();
  const duplicate = await listen(createServer((_req, res) => res.end(JSON.stringify({ items: [{ id: 'a', name: 'A' }, { id: 'a', name: 'B' }] }))));
  await expect(new BackendSectorProvider(duplicate).getActiveSectors()).rejects.toThrow();
});
it('forbids file sectors in trained mode and rejects unknown model type', async () => {
  await expect(createClassificationServer({ AI_MODE: 'trained', AI_SERVICE_TOKEN: token, AI_MODEL_PATH: 'unused', AI_SECTOR_SOURCE: 'mock-file' })).rejects.toThrow('MOCK_SECTORS_NOT_ALLOWED');
  await expect(createClassificationServer({ AI_MODE: 'mock', AI_SERVICE_TOKEN: token, AI_MODEL_PATH: 'unused', AI_SECTOR_SOURCE: 'mock-file', AI_MODEL_TYPE: 'unknown' })).rejects.toThrow('AI_MODEL_TYPE');
});
