import { describe, expect, it } from 'vitest';
import { isInstitutionalTerm } from '../src/preprocessing/institutional-dictionary.js';
import { normalizeText } from '../src/preprocessing/normalize.js';
import { correctSpelling, selectUnambiguousCorrection } from '../src/preprocessing/spell-checker.js';

describe('pré-processamento', () => {
  it('normaliza Unicode, caixa e espaços sem remover informação', () => {
    expect(normalizeText('  NÃO   consigo — acessar!  ')).toBe('não consigo — acessar!');
  });
  it('reconhece termos institucionais sem depender de caixa ou acento', () => {
    expect(isInstitutionalTerm('sigaa')).toBe(true);
    expect(isInstitutionalTerm('rematricula')).toBe(true);
  });
  it('corrige somente quando a melhor sugestão é inequívoca', () => {
    expect(selectUnambiguousCorrection('acesar', ['acessar', 'cessar'])).toBe('acessar');
    expect(selectUnambiguousCorrection('caza', ['casa', 'capa'])).toBeUndefined();
  });
  it('corrige erros do domínio com o dicionário compacto', async () => {
    expect(await correctSpelling('portau')).toBe('portal');
    expect(await correctSpelling('SIGAA Moodle')).toBe('SIGAA Moodle');
  });
});
