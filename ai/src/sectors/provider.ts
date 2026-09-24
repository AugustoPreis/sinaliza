import { readFile } from 'node:fs/promises';
import type { SectorDefinition, SectorId } from '../shared/types.js';
import { AI_CONFIG } from '../config/ai.js';

export interface SectorProvider {
  getActiveSectors(): Promise<SectorDefinition[]>;
}

interface SectorFile { kind: 'DEVELOPMENT_MOCK' | 'OFFICIAL'; version: string; sectors: SectorDefinition[] }

function validateSectors(sectors: SectorDefinition[]): SectorDefinition[] {
  const active = sectors.filter((sector) => sector.active);
  if (active.length === 0) throw new Error('Nenhum setor ativo foi fornecido.');
  const ids = active.map((sector) => sector.id.trim());
  if (ids.some((id) => !id)) throw new Error('Todo setor precisa possuir um ID não vazio.');
  if (new Set(ids).size !== ids.length) throw new Error('A lista de setores possui IDs duplicados.');
  for (const sector of active) {
    if (!Array.isArray(sector.examples) || sector.examples.filter((example) => typeof example === 'string' && example.trim()).length < AI_CONFIG.minimumExamplesPerSector) {
      throw new Error(`O setor ${sector.id} precisa possuir ao menos ${AI_CONFIG.minimumExamplesPerSector} exemplos representativos.`);
    }
  }
  return active.map((sector) => ({ ...sector, id: sector.id.trim(), name: sector.name.trim(), examples: sector.examples.map((example) => example.trim()) }));
}

export class FileSectorProvider implements SectorProvider {
  constructor(private readonly path: string) {}
  async getActiveSectors(): Promise<SectorDefinition[]> {
    let parsed: SectorFile;
    try { parsed = JSON.parse(await readFile(this.path, 'utf8')) as SectorFile; }
    catch (error) { throw new Error(`Não foi possível carregar a configuração de setores: ${this.path}`, { cause: error }); }
    if (!Array.isArray(parsed.sectors)) throw new Error('Configuração de setores inválida.');
    return validateSectors(parsed.sectors);
  }
}

export class MockSectorProvider implements SectorProvider {
  constructor(private readonly sectors: SectorDefinition[]) {}
  async getActiveSectors(): Promise<SectorDefinition[]> { return validateSectors(this.sectors); }
}

/** Adapter para o contrato real GET /api/v1/sectors do backend Sinaliza. */
export class BackendSectorProvider implements SectorProvider {
  constructor(private readonly baseUrl: string, private readonly fetcher: typeof fetch = fetch, private readonly options: { token?: string; timeoutMs?: number } = {}) {
    const url = new URL(baseUrl);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw new Error('BACKEND_API_URL inválida.');
    if (!Number.isInteger(options.timeoutMs ?? 3000) || (options.timeoutMs ?? 3000) <= 0) throw new Error('BACKEND_TIMEOUT_MS inválido.');
  }
  async getActiveSectors(): Promise<SectorDefinition[]> {
    const response = await this.fetcher(`${this.baseUrl.replace(/\/$/, '')}/sectors`, {
      headers: this.options.token ? { cookie: `access_token=${encodeURIComponent(this.options.token)}` } : {},
      signal: AbortSignal.timeout(this.options.timeoutMs ?? 3000), redirect: 'error',
    });
    if (!response.ok) throw new Error(`Não foi possível carregar setores do backend (HTTP ${response.status}).`);
    const raw = await response.json() as { success?: boolean; data?: unknown; items?: unknown };
    if (!raw || typeof raw !== 'object' || raw.success === false) throw new Error('Resposta de setores inválida.');
    const payload = (raw.success === true ? raw.data : raw) as { items?: Array<{ id?: unknown; name?: unknown }> };
    if (!payload) throw new Error('Resposta de setores inválida.');
    if (!Array.isArray(payload.items) || payload.items.length === 0) throw new Error('Resposta de setores inválida: esperado { items: [] }.');
    const ids = new Set<string>();
    return payload.items.map((item) => {
      if (!item || typeof item.id !== 'string' || typeof item.name !== 'string' || !item.id.trim() || !item.name.trim() || ids.has(item.id)) throw new Error('Setor do backend sem id ou name válido.');
      ids.add(item.id);
      return { id: item.id, name: item.name, active: true, examples: [] };
    });
  }
}

export function findNewSystemSectorIds(system: SectorDefinition[], modelSectorIds: SectorId[]): SectorId[] {
  const known = new Set(modelSectorIds);
  return system.filter((sector) => sector.active && !known.has(sector.id)).map((sector) => sector.id);
}

// O adapter HTTP/DB será implementado no backend. A IA depende somente deste contrato.
export interface BackendSectorAdapter extends SectorProvider {}
