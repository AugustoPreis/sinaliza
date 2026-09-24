import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClassificationServer } from '../src/http/server.js';
import { trainTfidfModel, saveTfidfModel } from '../src/tfidf/model.js';
import { mkdtemp, rm } from 'node:fs/promises';
import type { Server } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * Teste de integração: Simula chamadas do Backend Sinaliza
 *
 * Valida que:
 * 1. Endpoint /classification/preview responde corretamente
 * 2. Resposta inclui campos requeridos
 * 3. Autenticação funciona
 * 4. Erros são tratados corretamente
 */

describe('Backend Sinaliza Integration', () => {
  let server: Server;
  let port: number;
  let tmpDir: string;
  const baseUrl = 'http://127.0.0.1';
  const token = 'x'.repeat(64); // Token válido (64 caracteres)

  beforeAll(async () => {
    // Criar diretório temporário para modelo
    tmpDir = await mkdtemp(join(tmpdir(), 'sinaliza-test-'));

    // Treinar modelo TF-IDF simples para teste
    // IMPORTANTE: Use os MESMOS IDs que estão em config/sectors.mock.json
    const trainData = [
      'não consigo acessar o portal',
      'meu login está bloqueado',
      'quero alterar minha matrícula',
      'não recebi meu boleto',
      'preciso renovar empréstimo de livro',
      'a tomada da sala está sem energia',
    ];
    const labels = ['TI', 'TI', 'Secretaria Acadêmica', 'Financeiro', 'Biblioteca', 'Infraestrutura'];

    const artifact = await trainTfidfModel(trainData, labels, 'word');
    const modelPath = join(tmpDir, 'model.json');
    await saveTfidfModel(modelPath, artifact);

    // Criar servidor com modo mock para testes
    server = await createClassificationServer({
      AI_MODE: 'mock',
      AI_SERVICE_TOKEN: token,
      AI_MODEL_TYPE: 'tfidf',
      AI_MODEL_PATH: modelPath,
      AI_SECTOR_SOURCE: 'mock-file',
    });

    // Iniciar servidor em porta aleatória
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        port = (server.address() as any).port;
        resolve();
      });
    });

    console.log(`Servidor de teste na porta ${port}`);
  });

  afterAll(() => {
    server.close();
    return rm(tmpDir, { recursive: true, force: true });
  });

  describe('POST /classification/preview', () => {
    it('deve retornar 200 com estrutura exigida', async () => {
      const response = await fetch(`${baseUrl}:${port}/classification/preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          description: 'não consigo acessar o portal',
        }),
      });

      expect(response.status).toBe(200);
      const body = await response.json() as Record<string, any>;

      // Campos obrigatórios
      expect(body).toHaveProperty('automatic_sector');
      expect(body.automatic_sector).toHaveProperty('id');
      expect(body.automatic_sector).toHaveProperty('name');
      expect(typeof body.automatic_sector.id).toBe('string');
      expect(typeof body.automatic_sector.name).toBe('string');

      // Campos opcionais recomendados
      expect(body).toHaveProperty('confidence');
      expect(typeof body.confidence).toBe('number');
      expect(body.confidence).toBeGreaterThanOrEqual(0);
      expect(body.confidence).toBeLessThanOrEqual(1);

      // Campos de debug (não na spec, OK retornar)
      expect(body).toHaveProperty('model');
    });

    it('deve usar token Bearer correto', async () => {
      const response = await fetch(`${baseUrl}:${port}/classification/preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          description: 'problema com internet',
        }),
      });

      expect(response.status).toBe(200);
      expect(response.ok).toBe(true);
    });

    it('deve rejeitar requisição sem token (401)', async () => {
      const response = await fetch(`${baseUrl}:${port}/classification/preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Sem Authorization
        },
        body: JSON.stringify({
          description: 'teste sem token',
        }),
      });

      expect(response.status).toBe(401);
      const body = await response.json() as Record<string, any>;
      expect(body.code).toBe('UNAUTHORIZED');
    });

    it('deve rejeitar token inválido (401)', async () => {
      const response = await fetch(`${baseUrl}:${port}/classification/preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer token-invalido-errado',
        },
        body: JSON.stringify({
          description: 'teste com token errado',
        }),
      });

      expect(response.status).toBe(401);
    });

    it('deve rejeitar descrição vazia (400)', async () => {
      const response = await fetch(`${baseUrl}:${port}/classification/preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          description: '',
        }),
      });

      expect(response.status).toBe(400);
      const body = await response.json() as Record<string, any>;
      expect(body.code).toBe('INVALID_REQUEST');
    });

    it('deve rejeitar descrição muito longa (400)', async () => {
      const response = await fetch(`${baseUrl}:${port}/classification/preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          description: 'x'.repeat(2001), // Máximo é 2000
        }),
      });

      expect(response.status).toBe(400);
    });

    it('deve rejeitar JSON inválido (400)', async () => {
      const response = await fetch(`${baseUrl}:${port}/classification/preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: 'not-json',
      });

      expect(response.status).toBe(400);
    });

    it('deve rejeitar description faltando (400)', async () => {
      const response = await fetch(`${baseUrl}:${port}/classification/preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          wrong_field: 'conteúdo',
        }),
      });

      expect(response.status).toBe(400);
    });

    it('deve rejeitar payload muito grande (413)', async () => {
      const response = await fetch(`${baseUrl}:${port}/classification/preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          description: 'x'.repeat(20000), // Excede limite de 16KB
        }),
      });

      expect(response.status).toBe(413);
    });

    it('deve rejeitar métodos HTTP incorretos (404)', async () => {
      const response = await fetch(`${baseUrl}:${port}/classification/preview`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      expect(response.status).toBe(404);
    });

    it('deve rejeitar rotas não existentes (404)', async () => {
      const response = await fetch(`${baseUrl}:${port}/api/v1/tickets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(404);
    });

    it('exemplos do Sinaliza: termos específicos devem ser classificados', async () => {
      const response = await fetch(`${baseUrl}:${port}/classification/preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          description: 'Não consigo acessar o portal acadêmico',
        }),
      });

      expect(response.status).toBe(200);
      const body = await response.json() as Record<string, any>;

      // Apenas validar que retorna um setor válido (pouco dados de treinamento neste teste)
      expect(['TI', 'Secretaria Acadêmica', 'Financeiro', 'Biblioteca', 'Infraestrutura']).toContain(
        body.automatic_sector.id,
      );
    });

    it('resposta deve incluir sector_id para compatibilidade', async () => {
      const response = await fetch(`${baseUrl}:${port}/classification/preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          description: 'teste integração',
        }),
      });

      expect(response.status).toBe(200);
      const body = await response.json() as Record<string, any>;

      // Campo sector_id pode ser útil para IA retornar
      // (não mandatório na spec, mas útil para clients)
      expect(body).toHaveProperty('sector_id');
      expect(body.sector_id).toBe(body.automatic_sector.id);
    });

    it('resposta deve ser JSON válido com Cache-Control', async () => {
      const response = await fetch(`${baseUrl}:${port}/classification/preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          description: 'teste headers',
        }),
      });

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toBe('application/json');
      expect(response.headers.get('cache-control')).toBe('no-store');
    });
  });
});
