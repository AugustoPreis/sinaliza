import { describe, expect, it } from 'vitest';
import { predictWithTfidf, trainTfidfModel } from '../src/tfidf/model.js';

describe('inferência TF-IDF', () => {
  it('usa somente o artefato previamente treinado', async () => {
    const texts = ['senha portal', 'login sistema', 'boleto mensalidade', 'pagamento parcela', 'matrícula disciplina', 'histórico escolar', 'livro empréstimo', 'acervo biblioteca'];
    const labels = ['TI', 'TI', 'Financeiro', 'Financeiro', 'Secretaria Acadêmica', 'Secretaria Acadêmica', 'Biblioteca', 'Biblioteca'] as const;
    const artifact = await trainTfidfModel(texts, [...labels], 'word');
    const result = await predictWithTfidf(JSON.parse(JSON.stringify(artifact)), 'problema com senha do portal');
    expect(result.model).toBe('tfidf-word-rf');
    expect(result.confidence).toBeGreaterThanOrEqual(0);
  });
});
