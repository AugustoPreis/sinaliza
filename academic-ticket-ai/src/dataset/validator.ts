import { normalizeText } from '../preprocessing/normalize.js';
import { AI_CONFIG } from '../config/ai.js';
import type { SectorDefinition, SectorId, TicketRecord } from '../shared/types.js';

export interface DatasetValidation {
  status: 'VALID';
  total: number;
  sectorCount: number;
  distribution: Record<SectorId, number>;
  minimumPerSector: number;
  maximumPerSector: number;
  difference: number;
  exactDuplicates: number;
  duplicateRate: number;
  labelLeakageCount: number;
  lengthDistribution: { short: number; medium: number; long: number };
  maximumOpeningRate: number;
  examplesCovered: number;
  examplesTotal: number;
  checks: Record<string, 'PASS'>;
}

function escaped(value: string): string { return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

export function validateDataset(records: TicketRecord[], sectors: SectorDefinition[], expectedSize = 10_000): DatasetValidation {
  if (records.length !== expectedSize) throw new Error(`Dataset deve ter exatamente ${expectedSize} registros; recebeu ${records.length}.`);
  const sectorIds = sectors.map((sector) => sector.id);
  if (sectorIds.length === 0 || new Set(sectorIds).size !== sectorIds.length) throw new Error('IDs de setores vazios ou duplicados.');
  if (sectors.some((sector) => !sector.examples?.length)) throw new Error('Todos os setores precisam fornecer exemplos representativos.');
  const allowed = new Set(sectorIds);
  const distribution = Object.fromEntries(sectorIds.map((id) => [id, 0])) as Record<SectorId, number>;
  const fingerprints = new Set<string>();
  const openings = new Map<string, number>();
  const lengthDistribution = { short: 0, medium: 0, long: 0 };
  let exactDuplicates = 0;
  let labelLeakageCount = 0;
  const groupSectors = new Map<string, SectorId>();
  for (const record of records) {
    const text = record.originalText.trim();
    if (!text) throw new Error('O dataset possui descrição vazia.');
    if (!allowed.has(record.sectorId)) throw new Error(`Setor desconhecido no dataset: ${record.sectorId}`);
    if (!record.sourceExampleId?.trim() || !record.groupId?.trim()) throw new Error('Todo registro precisa de source_example_id e group_id.');
    const groupSector = groupSectors.get(record.groupId);
    if (groupSector && groupSector !== record.sectorId) throw new Error(`group_id ${record.groupId} aparece em setores diferentes.`);
    groupSectors.set(record.groupId, record.sectorId);
    distribution[record.sectorId] = (distribution[record.sectorId] ?? 0) + 1;
    const fingerprint = normalizeText(text);
    if (fingerprints.has(fingerprint)) exactDuplicates += 1;
    fingerprints.add(fingerprint);
    const opening = fingerprint.split(/\s+/).slice(0, 3).join(' ');
    openings.set(opening, (openings.get(opening) ?? 0) + 1);
    if (text.length < AI_CONFIG.textLength.short) lengthDistribution.short += 1;
    else if (text.length <= AI_CONFIG.textLength.medium) lengthDistribution.medium += 1;
    else lengthDistribution.long += 1;
    const ownSector = sectors.find((sector) => sector.id === record.sectorId)!;
    const normalizedName = normalizeText(ownSector.name);
    const explicitLabel = normalizedName.length >= 4 && new RegExp(`(^|\\s)${escaped(normalizedName)}(?=\\s|$)`, 'u').test(fingerprint);
    const legitimateUsage = normalizedName === 'financeiro' && /respons[aá]vel financeiro|conta financeira|contrato financeiro/.test(fingerprint);
    if (explicitLabel && !legitimateUsage) labelLeakageCount += 1;
  }
  const counts = Object.values(distribution);
  if (counts.some((count) => count === 0)) throw new Error('Nem todos os setores estão representados.');
  const minimumPerSector = Math.min(...counts);
  const maximumPerSector = Math.max(...counts);
  const difference = maximumPerSector - minimumPerSector;
  if (difference > 1) throw new Error('O dataset não está balanceado.');
  const duplicateRate = exactDuplicates / records.length;
  if (duplicateRate > AI_CONFIG.duplicateThreshold) throw new Error(`Excesso de duplicatas exatas: ${(duplicateRate * 100).toFixed(2)}%.`);
  if (labelLeakageCount) throw new Error(`${labelLeakageCount} descrições revelam explicitamente o nome do setor.`);
  if (Object.values(lengthDistribution).some((count) => count === 0)) throw new Error('O dataset não possui variedade suficiente de comprimentos.');
  const maximumOpeningRate = Math.max(...openings.values()) / records.length;
  if (maximumOpeningRate > AI_CONFIG.maximumOpeningRate) throw new Error(`Um mesmo início de frase domina ${(maximumOpeningRate * 100).toFixed(2)}% do dataset.`);
  let examplesCovered = 0;
  const normalizedTexts = records.map((record) => ({ sectorId: record.sectorId, text: normalizeText(record.originalText) }));
  for (const sector of sectors) for (const example of sector.examples) {
    const reference = normalizeText(example);
    if (normalizedTexts.some((record) => record.sectorId === sector.id && record.text.includes(reference))) examplesCovered += 1;
  }
  const examplesTotal = sectors.reduce((sum, sector) => sum + sector.examples.length, 0);
  if (examplesCovered !== examplesTotal) throw new Error(`Nem todos os exemplos fornecidos foram utilizados: ${examplesCovered}/${examplesTotal}.`);
  return {
    status: 'VALID', total: records.length, sectorCount: sectors.length, distribution,
    minimumPerSector, maximumPerSector, difference, exactDuplicates, duplicateRate,
    labelLeakageCount, lengthDistribution, maximumOpeningRate, examplesCovered, examplesTotal,
    checks: { total: 'PASS', sectors: 'PASS', balance: 'PASS', texts: 'PASS', duplicates: 'PASS', variety: 'PASS', labelLeakage: 'PASS', examples: 'PASS' },
  };
}
