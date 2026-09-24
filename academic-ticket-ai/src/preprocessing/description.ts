import { normalizeText } from './normalize.js';
import { correctSpelling } from './spell-checker.js';

export async function prepareDescription(text: string) {
  const normalized = normalizeText(text);
  const corrected = await correctSpelling(normalized);
  const before = normalized.match(/\p{L}+/gu) ?? [];
  const after = corrected.match(/\p{L}+/gu) ?? [];
  return { text: corrected, correctedTokens: before.filter((word, index) => word !== after[index]).length };
}
/** Blocos curtos para que o encoder não descarte silenciosamente o final da descrição. */
export function descriptionChunks(text: string, limit = 400): string[] {
  const words = text.match(/\S+\s*/gu) ?? [];
  const chunks: string[] = [];
  let current = '';
  for (const word of words) {
    if (current.length + word.length > limit && current.trim()) { chunks.push(current.trim()); current = ''; }
    // Também limita palavras sem espaços, incluindo URLs e texto com erros.
    for (let start = 0; start < word.length; start += limit) {
      const part = word.slice(start, start + limit);
      if (current.length + part.length > limit) { chunks.push(current.trim()); current = ''; }
      current += part;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}
