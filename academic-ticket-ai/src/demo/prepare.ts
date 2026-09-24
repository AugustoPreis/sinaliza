import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { AI_CONFIG } from '../config/ai.js';
import { latestModelPath } from '../models/latest.js';
import { loadTfidfModel } from '../tfidf/model.js';

export const DEMO_MODEL_PATH = 'models/demo/tfidf.json';

/** Copies only a verified frozen MOCK artifact. Never trains or changes latest.json. */
export async function prepareDemoModel(): Promise<string> {
  const source = await latestModelPath();
  const artifact = await loadTfidfModel(source);
  const bytes = await readFile(AI_CONFIG.mockDatasetPath);
  const hash = createHash('sha256').update(bytes).digest('hex');
  if (artifact.metadata.datasetHash !== hash || artifact.metadata.datasetPath !== AI_CONFIG.mockDatasetPath ||
      artifact.metadata.datasetVersion !== AI_CONFIG.datasetVersion || artifact.metadata.dataSource === 'REAL') {
    throw new Error('O artefato não corresponde ao dataset MOCK congelado. Preparação cancelada.');
  }
  artifact.metadata.dataSource = 'MOCK';
  await mkdir('models/demo', { recursive: true });
  await writeFile(DEMO_MODEL_PATH, `${JSON.stringify(artifact, null, 2)}\n`);
  return DEMO_MODEL_PATH;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  prepareDemoModel().then(path => console.log(`Cópia MOCK verificada: ${path}. Sem retreinamento.`))
    .catch((error: unknown) => { console.error(error); process.exitCode = 1; });
}
