const MODEL_ID = 'Xenova/all-MiniLM-L6-v2';

interface TensorLike { dims: number[]; tolist(): unknown }
interface FeatureExtractor {
  (texts: string[], options: { pooling: 'mean'; normalize: true }): Promise<TensorLike>;
}

let extractorPromise: Promise<FeatureExtractor> | undefined;

async function getExtractor(): Promise<FeatureExtractor> {
  extractorPromise ??= (async () => {
    const transformers = await import('@huggingface/transformers');
    const created: unknown = await transformers.pipeline('feature-extraction', MODEL_ID);
    if (typeof created !== 'function') throw new Error('Pipeline MiniLM inválido.');
    return created as FeatureExtractor;
  })();
  return extractorPromise;
}

function isMatrix(value: unknown): value is number[][] {
  return Array.isArray(value) && value.every((row) => Array.isArray(row) && row.every((item) => typeof item === 'number'));
}

export async function embedTexts(texts: string[], batchSize = 16): Promise<number[][]> {
  if (texts.length === 0) return [];
  const extractor = await getExtractor();
  const embeddings: number[][] = [];
  for (let start = 0; start < texts.length; start += batchSize) {
    const output = await extractor(texts.slice(start, start + batchSize), { pooling: 'mean', normalize: true });
    const values = output.tolist();
    if (!isMatrix(values) || values.some((row) => row.length !== 384)) {
      throw new Error(`Shape inesperado do MiniLM: ${JSON.stringify(output.dims)}; esperado [batch, 384].`);
    }
    embeddings.push(...values);
  }
  return embeddings;
}

export const MINILM_MODEL_ID = MODEL_ID;
