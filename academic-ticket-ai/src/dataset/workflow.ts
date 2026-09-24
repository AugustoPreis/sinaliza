import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { AI_CONFIG } from '../config/ai.js';
import { FileSectorProvider } from '../sectors/provider.js';
import type { DatasetSplit, TicketRecord } from '../shared/types.js';
import { loadDataset } from './loader.js';
import { stratifiedSplit } from './split.js';
import { validateDataset, type DatasetValidation } from './validator.js';

export interface PreparedDataset {
  path: string;
  hash: string;
  version: string;
  records: TicketRecord[];
  split: DatasetSplit<TicketRecord>;
  validation: DatasetValidation;
}

export async function prepareValidatedDataset(path: string = AI_CONFIG.mockDatasetPath, ratios: { train: number; validation: number; test: number } = AI_CONFIG.split): Promise<PreparedDataset> {
  const sectors = await new FileSectorProvider(AI_CONFIG.mockSectorConfigPath).getActiveSectors();
  const bytes = await readFile(path);
  const records = await loadDataset(path, sectors.map((sector) => sector.id));
  const validation = validateDataset(records, sectors, AI_CONFIG.datasetSize);
  const split = stratifiedSplit(records, AI_CONFIG.seed, ratios);
  return { path, hash: createHash('sha256').update(bytes).digest('hex'), version: AI_CONFIG.datasetVersion, records, split, validation };
}
