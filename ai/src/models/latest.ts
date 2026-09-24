import { readJson } from '../shared/utils.js';

interface LatestModel { runId: string; modelPath: string; reportPath: string }
export async function latestModelPath(): Promise<string> {
  const latest = await readJson<LatestModel>('models/latest.json');
  if (!latest.modelPath?.trim()) throw new Error('O ponteiro models/latest.json é inválido. Execute npm run ai:pipeline.');
  return latest.modelPath;
}
