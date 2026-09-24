import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { assertModelDataSourceAllowed } from '../config/runtime.js';
import { AI_CONFIG } from '../config/ai.js';
import { FileSectorProvider } from '../sectors/provider.js';
import { ClassificationPreviewService } from '../classification/service.js';
import { loadTfidfModel, predictWithTfidf } from '../tfidf/model.js';
import { DEMO_MODEL_PATH } from './prepare.js';

async function main(): Promise<void> {
  const artifact = await loadTfidfModel(DEMO_MODEL_PATH);
  assertModelDataSourceAllowed(artifact.metadata.dataSource, 'mock');
  const service = new ClassificationPreviewService({
    modelSectorIds: artifact.metadata.sectorIds,
    classify: description => predictWithTfidf(artifact, description),
  }, new FileSectorProvider(AI_CONFIG.mockSectorConfigPath));
  console.log('DEMONSTRAÇÃO MOCK — exemplos existentes; sem banco e sem retreinamento.');
  console.log('Similaridade não é probabilidade de acerto. Este comando testa a IA local, não o backend NestJS.');
  const predict = async (description: string) => {
    if (description.length > 2000) throw new Error('Use até 2.000 caracteres.');
    const result = await service.preview({ description });
    console.log(JSON.stringify({ ...result, dataSource: 'MOCK' }, null, 2));
  };
  const text = process.argv.slice(2).join(' ').trim();
  if (text) { await predict(text); return; }
  console.log('Digite uma descrição ou /sair.');
  const input = createInterface({ input: stdin, output: stdout });
  try {
    for await (const line of input) {
      if (line.trim() === '/sair') break;
      if (!line.trim()) continue;
      try { await predict(line); } catch (error) { console.error(error instanceof Error ? error.message : error); }
    }
  } finally { input.close(); }
}
main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
