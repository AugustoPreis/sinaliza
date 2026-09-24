import { describe, expect, it } from 'vitest';
import { TfidfVectorizer } from '../src/tfidf/vectorizer.js';

describe('TF-IDF', () => {
  it('mantém o mesmo espaço vetorial após serialização', () => {
    const fitted = new TfidfVectorizer({ mode: 'combined' });
    const train = fitted.fitTransform(['portal acadêmico', 'segunda via boleto']);
    const loaded = TfidfVectorizer.fromArtifact(JSON.parse(JSON.stringify(fitted.getArtifact())));
    expect(loaded.transform(['portal acadêmico'])).toEqual([train[0]]);
    expect(loaded.transform(['texto desconhecido'])[0]).toHaveLength(train[0]!.length);
  });
  it('character n-grams compartilham features em erros próximos', () => {
    const vectorizer = new TfidfVectorizer({ mode: 'char' }).fit(['portal', 'boleto']);
    const [correct, typo] = vectorizer.transform(['portal', 'portau']);
    const dot = correct!.reduce((sum, value, index) => sum + value * typo![index]!, 0);
    expect(dot).toBeGreaterThan(0);
  });
});
