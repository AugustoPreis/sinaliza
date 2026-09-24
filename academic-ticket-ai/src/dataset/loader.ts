import { readFile } from 'node:fs/promises';
import { parse } from 'csv-parse/sync';
import { AI_CONFIG } from '../config/ai.js';
import type { SectorId, TicketRecord } from '../shared/types.js';

interface CsvRow { text?: string; sector_id?: string; source_example_id?: string; group_id?: string; texto?: string; setor?: string }

export function datasetPath(path?: string): string {
  return path ?? process.env.DATASET_PATH ?? AI_CONFIG.mockDatasetPath;
}

export async function loadDataset(path?: string, allowedSectorIds?: Iterable<SectorId>): Promise<TicketRecord[]> {
  const resolvedPath = datasetPath(path);
  const allowed = allowedSectorIds ? new Set(allowedSectorIds) : undefined;
  const rows = parse(await readFile(resolvedPath, 'utf8'), {
    columns: true, skip_empty_lines: true, trim: true, bom: true,
  }) as CsvRow[];
  if (rows.length === 0) throw new Error('O dataset está vazio.');
  return rows.map((row, index) => {
    const text = row.text ?? row.texto;
    const sectorId = row.sector_id ?? row.setor;
    if (!text?.trim()) throw new Error(`Linha ${index + 2}: texto ausente.`);
    if (!sectorId?.trim()) throw new Error(`Linha ${index + 2}: sector_id ausente.`);
    if (allowed && !allowed.has(sectorId)) throw new Error(`Linha ${index + 2}: sector_id desconhecido: ${sectorId}`);
    const sourceExampleId = row.source_example_id?.trim();
    const groupId = row.group_id?.trim();
    if (!sourceExampleId || !groupId) throw new Error(`Linha ${index + 2}: source_example_id e group_id são obrigatórios.`);
    return { originalText: text.trim(), sectorId: sectorId.trim(), sourceExampleId, groupId };
  });
}
