import { appendFile, mkdir, readFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { SectorId } from '../shared/types.js';

export type FeedbackSource = 'REQUESTER' | 'SECTOR';
export interface ClassificationFeedback {
  text: string;
  predictedSectorId: SectorId;
  correctSectorId: SectorId;
  source: FeedbackSource;
  createdAt: string;
  modelVersion: string;
}

export interface FeedbackRepository {
  save(feedback: ClassificationFeedback): Promise<void>;
  list(): Promise<ClassificationFeedback[]>;
}

function validate(item: ClassificationFeedback): void {
  if (!item || typeof item.text !== 'string' || !item.text.trim()) throw new Error('O texto do feedback não pode estar vazio.');
  if (!item.predictedSectorId || !item.correctSectorId) throw new Error('Os IDs de setor são obrigatórios.');
  if (!['REQUESTER', 'SECTOR'].includes(item.source)) throw new Error('Fonte de feedback inválida.');
  if (!item.modelVersion?.trim()) throw new Error('A versão do modelo é obrigatória no feedback.');
  if (!Number.isFinite(Date.parse(item.createdAt))) throw new Error('Data do feedback inválida.');
}

export class JsonlFeedbackRepository implements FeedbackRepository {
  constructor(private readonly path: string) {}
  async save(feedback: ClassificationFeedback): Promise<void> {
    validate(feedback);
    await mkdir(dirname(this.path), { recursive: true });
    await appendFile(this.path, `${JSON.stringify(feedback)}\n`, { encoding: 'utf8', mode: 0o600 });
  }
  async list(): Promise<ClassificationFeedback[]> {
    let content: string;
    try { content = await readFile(this.path, 'utf8'); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw error;
    }
    const valid: ClassificationFeedback[] = [];
    for (const line of content.split('\n').filter(Boolean)) {
      try { const item = JSON.parse(line) as ClassificationFeedback; validate(item); valid.push(item); }
      catch { /* Uma linha corrompida é isolada sem invalidar os feedbacks válidos. */ }
    }
    return valid;
  }
}

export class InMemoryFeedbackRepository implements FeedbackRepository {
  private readonly items: ClassificationFeedback[] = [];
  async save(feedback: ClassificationFeedback): Promise<void> { validate(feedback); this.items.push({ ...feedback }); }
  async list(): Promise<ClassificationFeedback[]> { return this.items.map((item) => ({ ...item })); }
}

// Adapter futuro para persistência controlada pelo backend.
export interface BackendFeedbackAdapter extends FeedbackRepository {}
