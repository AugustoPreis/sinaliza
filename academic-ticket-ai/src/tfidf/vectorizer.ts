import type { TfidfMode } from '../shared/types.js';

export interface TfidfConfig {
  mode: TfidfMode;
  wordNgramRange: [number, number];
  charNgramRange: [number, number];
  minDocumentFrequency: number;
  sublinearTf: boolean;
  l2Normalize: boolean;
}

export interface TfidfArtifact { config: TfidfConfig; vocabulary: string[]; idf: number[] }

const DEFAULT_CONFIG: TfidfConfig = {
  mode: 'word', wordNgramRange: [1, 2], charNgramRange: [3, 5],
  minDocumentFrequency: 1, sublinearTf: true, l2Normalize: true,
};

function ngrams(tokens: string[], [minimum, maximum]: [number, number], separator: string): string[] {
  const result: string[] = [];
  for (let size = minimum; size <= maximum; size++) {
    for (let index = 0; index <= tokens.length - size; index++) result.push(tokens.slice(index, index + size).join(separator));
  }
  return result;
}

function features(text: string, config: TfidfConfig): string[] {
  const result: string[] = [];
  if (config.mode === 'word' || config.mode === 'combined') {
    const words = text.match(/[\p{L}\p{N}]+/gu) ?? [];
    result.push(...ngrams(words, config.wordNgramRange, ' ').map((value) => `w:${value}`));
  }
  if (config.mode === 'char' || config.mode === 'combined') {
    const bounded = ` ${text.replace(/\s+/g, ' ')} `;
    result.push(...ngrams([...bounded], config.charNgramRange, '').map((value) => `c:${value}`));
  }
  return result;
}

export class TfidfVectorizer {
  private artifact?: TfidfArtifact;

  constructor(config: Partial<TfidfConfig> = {}, artifact?: TfidfArtifact) {
    this.artifact = artifact ?? { config: { ...DEFAULT_CONFIG, ...config }, vocabulary: [], idf: [] };
  }

  fit(texts: string[]): this {
    if (texts.length === 0) throw new Error('Não é possível ajustar TF-IDF sem documentos.');
    const config = this.getArtifact().config;
    const documentFrequency = new Map<string, number>();
    for (const text of texts) {
      for (const feature of new Set(features(text, config))) {
        documentFrequency.set(feature, (documentFrequency.get(feature) ?? 0) + 1);
      }
    }
    const vocabulary = [...documentFrequency.entries()]
      .filter(([, count]) => count >= config.minDocumentFrequency)
      .map(([feature]) => feature).sort();
    const idf = vocabulary.map((feature) => Math.log((1 + texts.length) / (1 + documentFrequency.get(feature)!)) + 1);
    this.artifact = { config, vocabulary, idf };
    return this;
  }

  transform(texts: string[]): number[][] {
    const artifact = this.getArtifact();
    if (artifact.vocabulary.length === 0) throw new Error('TF-IDF ainda não foi ajustado.');
    const indexes = new Map(artifact.vocabulary.map((feature, index) => [feature, index]));
    return texts.map((text) => {
      const counts = new Map<string, number>();
      for (const feature of features(text, artifact.config)) counts.set(feature, (counts.get(feature) ?? 0) + 1);
      const vector = Array<number>(artifact.vocabulary.length).fill(0);
      for (const [feature, count] of counts) {
        const index = indexes.get(feature);
        if (index !== undefined) vector[index] = (artifact.config.sublinearTf ? 1 + Math.log(count) : count) * artifact.idf[index]!;
      }
      if (artifact.config.l2Normalize) {
        const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
        if (norm > 0) for (let index = 0; index < vector.length; index++) vector[index] = vector[index]! / norm;
      }
      return vector;
    });
  }

  fitTransform(texts: string[]): number[][] { return this.fit(texts).transform(texts); }
  getArtifact(): TfidfArtifact {
    if (!this.artifact) throw new Error('Artefato TF-IDF indisponível.');
    return structuredClone(this.artifact);
  }
  static fromArtifact(artifact: TfidfArtifact): TfidfVectorizer { return new TfidfVectorizer({}, artifact); }
}
