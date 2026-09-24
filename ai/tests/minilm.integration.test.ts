import { describe, expect, it } from 'vitest';
import { embedTexts } from '../src/minilm/embeddings.js';

const enabled = process.env.RUN_MINILM_TESTS === '1';
describe.skipIf(!enabled)('MiniLM local (integração)', () => {
  it('gera embeddings L2-normalizados com 384 dimensões em batch', async () => {
    const embeddings = await embedTexts(['portal acadêmico', 'segunda via do boleto'], 2);
    expect(embeddings).toHaveLength(2);
    expect(embeddings[0]).toHaveLength(384);
    const norm = Math.sqrt(embeddings[0]!.reduce((sum, value) => sum + value * value, 0));
    expect(norm).toBeCloseTo(1, 4);
  }, 120_000);
});

describe.skipIf(!enabled)('MiniLM + Random Forest persistida', () => {
  it('treina RF real, salva, carrega e preserva previsão e origem', async () => {
    const { mkdtemp, rm } = await import('node:fs/promises');
    const { tmpdir } = await import('node:os');
    const { join } = await import('node:path');
    const { trainMinilmModel, saveMinilmModel, loadMinilmModel, predictWithMinilm } = await import('../src/minilm/model.js');
    const directory = await mkdtemp(join(tmpdir(), 'minilm-roundtrip-'));
    try {
      const model = await trainMinilmModel(['senha portal', 'login bloqueado', 'boleto mensalidade', 'pagamento atrasado'], ['a', 'a', 'b', 'b']);
      expect(model.classifier.model).toBeDefined();
      expect(model.classifier.centroids).toBeUndefined();
      expect(model.metadata.dataSource).toBe('MOCK');
      const path = join(directory, 'model.json');
      await saveMinilmModel(path, model);
      const loaded = await loadMinilmModel(path);
      expect(await predictWithMinilm(loaded, 'senha portal')).toEqual(await predictWithMinilm(model, 'senha portal'));
    } finally { await rm(directory, { recursive: true, force: true }); }
  }, 120_000);
});

describe.skipIf(!enabled)('Serviço HTTP MiniLM sem banco', () => {
  it('carrega RF MiniLM e classifica no modo MOCK com setores do arquivo', async () => {
    const { mkdtemp, rm } = await import('node:fs/promises');
    const { tmpdir } = await import('node:os');
    const { join } = await import('node:path');
    const { trainMinilmModel, saveMinilmModel } = await import('../src/minilm/model.js');
    const { createClassificationServer } = await import('../src/http/server.js');
    const directory = await mkdtemp(join(tmpdir(), 'minilm-http-'));
    let server: Awaited<ReturnType<typeof createClassificationServer>> | undefined;
    try {
      const labels = ['TI', 'TI', 'Secretaria Acadêmica', 'Secretaria Acadêmica', 'Financeiro', 'Financeiro', 'Biblioteca', 'Biblioteca', 'Infraestrutura', 'Infraestrutura'];
      const model = await trainMinilmModel(['senha portal', 'login bloqueado', 'matrícula', 'histórico escolar', 'boleto mensalidade', 'pagamento atrasado', 'livro emprestado', 'reserva de livro', 'tomada quebrada', 'falta de energia'], labels);
      const path = join(directory, 'model.json');
      await saveMinilmModel(path, model);
      const token = 'minilm-http-test-token-'.repeat(2);
      server = await createClassificationServer({ AI_MODE: 'mock', AI_MODEL_TYPE: 'minilm', AI_SECTOR_SOURCE: 'mock-file', AI_MODEL_PATH: path, AI_SERVICE_TOKEN: token });
      await new Promise<void>((resolve, reject) => { server!.once('error', reject); server!.listen(0, '127.0.0.1', resolve); });
      const address = server.address();
      if (!address || typeof address === 'string') throw new Error('Porta ausente.');
      const response = await fetch(`http://127.0.0.1:${address.port}/classification/preview`, { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify({ description: 'senha portal' }) });
      expect(response.status).toBe(200);
      const payload = await response.json() as { sector_id: string; automatic_sector: { id: string }; dataSource: string; model: string };
      expect(labels).toContain(payload.sector_id);
      expect(payload.automatic_sector.id).toBe(payload.sector_id);
      expect(payload.dataSource).toBe('MOCK');
      expect(payload.model).toBe('minilm-rf');
    } finally {
      if (server?.listening) { server.closeAllConnections(); await new Promise<void>(resolve => server!.close(() => resolve())); }
      await rm(directory, { recursive: true, force: true });
    }
  }, 120_000);
});
