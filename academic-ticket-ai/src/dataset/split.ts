import { AI_CONFIG } from '../config/ai.js';
import type { DatasetSplit, TicketRecord } from '../shared/types.js';
import { normalizeText } from '../preprocessing/normalize.js';

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => { state += 0x6d2b79f5; let value = state; value = Math.imul(value ^ (value >>> 15), value | 1); value ^= value + Math.imul(value ^ (value >>> 7), value | 61); return ((value ^ (value >>> 14)) >>> 0) / 4294967296; };
}
function shuffle<T>(items: T[], random: () => number): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index--) { const other = Math.floor(random() * (index + 1)); [result[index], result[other]] = [result[other]!, result[index]!]; }
  return result;
}

export function assertNoGroupLeakage<T extends TicketRecord>(split: DatasetSplit<T>): void {
  const owners = new Map<string, string>();
  for (const [name, records] of Object.entries(split)) for (const record of records) {
    const owner = owners.get(record.groupId);
    if (owner && owner !== name) throw new Error(`Data leakage: group_id ${record.groupId} aparece em ${owner} e ${name}.`);
    owners.set(record.groupId, name);
  }
}

export function stratifiedSplit<T extends TicketRecord>(records: T[], seed: number = AI_CONFIG.seed, ratios: { train: number; validation: number; test: number } = AI_CONFIG.split): DatasetSplit<T> {
  if ([ratios.train, ratios.validation, ratios.test].some(value => !Number.isFinite(value) || value <= 0) || Math.abs(ratios.train + ratios.validation + ratios.test - 1) > 1e-9) throw new Error('Proporções de split inválidas.');
  const fingerprints = records.map((record) => normalizeText(record.originalText));
  if (new Set(fingerprints).size !== fingerprints.length) throw new Error('O dataset possui textos duplicados; o split foi interrompido para evitar vazamento.');
  const groups = new Map<string, T[]>();
  for (const record of records) {
    const group = groups.get(record.groupId) ?? [];
    if (group.some((item) => item.sectorId !== record.sectorId)) throw new Error(`group_id ${record.groupId} pertence a mais de um setor.`);
    group.push(record); groups.set(record.groupId, group);
  }
  const random = seededRandom(seed);
  const sectorGroups = new Map<string, T[][]>();
  for (const group of groups.values()) { const sectorId = group[0]!.sectorId; sectorGroups.set(sectorId, [...(sectorGroups.get(sectorId) ?? []), group]); }
  const split: DatasetSplit<T> = { train: [], validation: [], test: [] };
  for (const grouped of sectorGroups.values()) {
    const shuffled = shuffle(grouped, random);
    const groupCount = shuffled.length;
    const trainGroups = Math.floor(groupCount * ratios.train);
    const validationGroups = Math.floor(groupCount * ratios.validation);
    shuffled.forEach((group, index) => {
      const destination = index < trainGroups ? split.train : index < trainGroups + validationGroups ? split.validation : split.test;
      destination.push(...group);
    });
  }
  const result = { train: shuffle(split.train, random), validation: shuffle(split.validation, random), test: shuffle(split.test, random) };
  assertNoGroupLeakage(result);
  return result;
}

export function storedSplit(configuration: Record<string, unknown>): { train: number; validation: number; test: number } {
  const split = configuration.split;
  if (split === undefined) return AI_CONFIG.split;
  if (!split || typeof split !== 'object') throw new Error('Split do modelo inválido.');
  const value = split as { train: number; validation: number; test: number };
  if ([value.train, value.validation, value.test].some(n => typeof n !== 'number' || !Number.isFinite(n) || n <= 0) || Math.abs(value.train + value.validation + value.test - 1) > 1e-9) throw new Error('Split do modelo inválido.');
  return value;
}
