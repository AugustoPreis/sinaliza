import { readFile } from 'node:fs/promises';
import { latestModelPath } from './latest.js';

/** Release explícita quando disponível; caso contrário, último pipeline concluído. */
export async function defaultModel(): Promise<{ modelPath: string; modelType: string }> {
  let contents: string;
  try { contents = await readFile('models/release/manifest.json', 'utf8'); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    return { modelPath: await latestModelPath(), modelType: 'tfidf' };
  }
  const manifest = JSON.parse(contents) as { modelPath: string; modelType: string };
  if (!manifest.modelPath?.trim() || !['tfidf', 'minilm'].includes(manifest.modelType)) {
    throw new Error('Manifesto de entrega inválido.');
  }
  return manifest;
}
