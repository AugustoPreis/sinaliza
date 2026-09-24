import { expect, it } from 'vitest';
import { descriptionChunks, prepareDescription } from '../src/preprocessing/description.js';
it('preserva negações, siglas e valores e corrige erro inequívoco', async () => {
  const result = await prepareDescription('NÃO consigo acessar o portau pelo HDMI. Paguei R$ 120,00 por PIX.');
  expect(result.text).toContain('não');
  expect(result.text).toContain('hdmi');
  expect(result.text).toContain('pix');
  expect(result.text).toContain('120,00');
  expect(result.text).toContain('portal');
  expect(result.correctedTokens).toBeGreaterThan(0);
}, 30_000);
it('divide texto longo sem perder conteúdo no final nem palavras sem espaços', () => {
  const text = `${'Este é um contexto longo. '.repeat(50)}${'x'.repeat(450)} o projetor não liga`;
  const chunks = descriptionChunks(text);
  expect(chunks.every(chunk => chunk.length <= 400 && chunk.length > 0)).toBe(true);
  expect(chunks.join('').replace(/\s/g, '')).toBe(text.replace(/\s/g, ''));
  expect(chunks.at(-1)).toContain('projetor não liga');
});
