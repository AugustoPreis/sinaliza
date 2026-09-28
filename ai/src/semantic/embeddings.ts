export const SEMANTIC_MODEL = 'Xenova/paraphrase-multilingual-MiniLM-L12-v2';
export const SEMANTIC_REVISION = '2c4055b12046f11709e9df2c122e59ffbdc2f900';
type Extractor = (texts: string[], options: { pooling: 'mean'; normalize: true }) => Promise<{ tolist(): unknown }>;
let pending: Promise<Extractor> | undefined;
async function extractor(): Promise<Extractor> {
  pending ??= (async () => {
    const { pipeline, env } = await import('@huggingface/transformers');
    env.allowRemoteModels = false;
    if (process.env.AI_EMBEDDINGS_CACHE_DIR) env.cacheDir = process.env.AI_EMBEDDINGS_CACHE_DIR;
    return await pipeline('feature-extraction', SEMANTIC_MODEL, { revision: SEMANTIC_REVISION, dtype: 'q8' }) as unknown as Extractor;
  })().catch(error => { pending = undefined; throw error; });
  return pending;
}
export async function semanticEmbeddings(texts: string[]): Promise<number[][]> {
  if (!texts.length) return [];
  const model = await extractor();
  const rows: number[][] = [];
  for (let start = 0; start < texts.length; start += 16) {
    const values = (await model(texts.slice(start, start + 16), { pooling: 'mean', normalize: true })).tolist();
    if (!Array.isArray(values) || values.length !== Math.min(16, texts.length - start) ||
      values.some(row => !Array.isArray(row) || row.length !== 384 || row.some(value => typeof value !== 'number' || !Number.isFinite(value)))) {
      throw new Error('Embedding multilíngue inválido.');
    }
    rows.push(...values as number[][]);
  }
  return rows;
}
