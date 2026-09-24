import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { parse } from 'csv-parse/sync';
import { normalizeText } from '../preprocessing/normalize.js';
import type { SectorDefinition, SectorId, TicketRecord } from '../shared/types.js';
import { redactSensitiveData, scanPrivacyRisks, type PrivacyRiskType } from './privacy.js';

type UnknownRow = Record<string, unknown>;

export interface DatasetPreparationReport {
  inputRows: number;
  outputRows: number;
  removedDuplicates: number;
  redactions: Partial<Record<PrivacyRiskType, number>>;
  distribution: Record<SectorId, number>;
  warnings: string[];
}

const TEXT_COLUMNS = ['texto', 'text', 'chamado', 'descricao', 'descrição', 'mensagem'];
const SECTOR_COLUMNS = ['setor', 'sector', 'categoria', 'departamento'];

function valueFrom(row: UnknownRow, names: string[]): string | undefined {
  const entry = Object.entries(row).find(([key]) => names.includes(normalizeText(key)));
  return typeof entry?.[1] === 'string' ? entry[1].trim() : undefined;
}

function csvCell(value: string): string { return `"${value.replace(/"/g, '""')}"`; }

export function analyzeRecords(records: TicketRecord[]): DatasetPreparationReport {
  const sectorIds = [...new Set(records.map((record) => record.sectorId))];
  const distribution = Object.fromEntries(sectorIds.map((sector) => [sector, 0])) as Record<SectorId, number>;
  for (const record of records) distribution[record.sectorId] = (distribution[record.sectorId] ?? 0) + 1;
  const counts = Object.values(distribution);
  const warnings: string[] = [];
  for (const sector of sectorIds) if (distribution[sector]! < 20) warnings.push(`${sector}: menos de 20 chamados.`);
  const positive = counts.filter((count) => count > 0);
  if (positive.length && Math.max(...positive) / Math.min(...positive) > 2) warnings.push('Dataset desequilibrado: a maior classe tem mais que o dobro da menor.');
  warnings.push('Revise manualmente nomes de pessoas e informações sensíveis contextuais; detecção automática não é garantia de anonimização.');
  return { inputRows: records.length, outputRows: records.length, removedDuplicates: 0, redactions: {}, distribution, warnings };
}

export async function prepareRealDataset(inputPath: string, sectors: SectorDefinition[], outputPath = 'data/private/chamados-reais.csv'): Promise<DatasetPreparationReport> {
  if (resolve(inputPath) === resolve(outputPath)) throw new Error('Entrada e saída devem ser arquivos diferentes para preservar o original.');
  const rows = parse(await readFile(inputPath, 'utf8'), { columns: true, skip_empty_lines: true, trim: true, bom: true }) as UnknownRow[];
  if (!rows.length) throw new Error('O CSV de entrada está vazio.');
  const redactions: Partial<Record<PrivacyRiskType, number>> = {};
  const unique = new Map<string, TicketRecord>();
  const sectorLookup = new Map<string, SectorId>();
  for (const sector of sectors.filter((item) => item.active)) {
    sectorLookup.set(normalizeText(sector.id), sector.id);
    sectorLookup.set(normalizeText(sector.name), sector.id);
  }
  rows.forEach((row, index) => {
    const text = valueFrom(row, TEXT_COLUMNS);
    const rawSector = valueFrom(row, SECTOR_COLUMNS);
    if (!text) throw new Error(`Linha ${index + 2}: coluna de texto ausente ou vazia.`);
    if (!rawSector) throw new Error(`Linha ${index + 2}: coluna de setor ausente ou vazia.`);
    const sectorId = sectorLookup.get(normalizeText(rawSector));
    if (!sectorId) throw new Error(`Linha ${index + 2}: setor não reconhecido: ${rawSector}`);
    for (const risk of scanPrivacyRisks(text)) redactions[risk.type] = (redactions[risk.type] ?? 0) + risk.count;
    const redacted = redactSensitiveData(text).replace(/\s+/g, ' ').trim();
    const fingerprint = `${sectorId}:${normalizeText(redacted).normalize('NFD').replace(/\p{M}/gu, '').replace(/[^\p{L}\p{N}]+/gu, ' ')}`;
    if (!unique.has(fingerprint)) unique.set(fingerprint, { originalText: redacted, sectorId, sourceExampleId: fingerprint, groupId: fingerprint });
  });
  const records = [...unique.values()];
  const report = analyzeRecords(records);
  report.inputRows = rows.length;
  report.removedDuplicates = rows.length - records.length;
  report.redactions = redactions;
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `text,sector_id,source_example_id,group_id\n${records.map((record) => `${csvCell(record.originalText)},${csvCell(record.sectorId)},${csvCell(record.sourceExampleId)},${csvCell(record.groupId)}`).join('\n')}\n`, { encoding: 'utf8', mode: 0o600 });
  await writeFile(`${outputPath}.report.json`, JSON.stringify(report, null, 2), { encoding: 'utf8', mode: 0o600 });
  return report;
}
