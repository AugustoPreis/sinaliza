export const INSTITUTIONAL_TERMS = [
  'SIGAA', 'AVA', 'Moodle', 'TCC', 'FIES', 'ENEM', 'RA',
  'rematrícula', 'trancamento', 'reingresso',
] as const;

export function isInstitutionalTerm(word: string): boolean {
  const folded = word.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('pt-BR');
  return INSTITUTIONAL_TERMS.some((term) =>
    term.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('pt-BR') === folded,
  );
}
