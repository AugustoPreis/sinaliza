export type PrivacyRiskType = 'email' | 'cpf' | 'telefone' | 'ra' | 'url';

export interface PrivacyRisk {
  type: PrivacyRiskType;
  count: number;
}

const PATTERNS: ReadonlyArray<{ type: PrivacyRiskType; pattern: RegExp; replacement: string }> = [
  { type: 'email', pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/giu, replacement: '[EMAIL]' },
  { type: 'cpf', pattern: /\b\d{3}\.?\d{3}\.?\d{3}[-.]?\d{2}\b/gu, replacement: '[CPF]' },
  { type: 'ra', pattern: /\b(?:ra|matr[ií]cula)\s*[:#-]?\s*\d{4,15}\b/giu, replacement: '[RA]' },
  { type: 'telefone', pattern: /(?<!\d)(?:\+?55\s*)?(?:\(?\d{2}\)?\s*)?9?\d{4}[-\s]?\d{4}(?!\d)/gu, replacement: '[TELEFONE]' },
  { type: 'url', pattern: /\bhttps?:\/\/[^\s]+/giu, replacement: '[URL]' },
];

export function scanPrivacyRisks(text: string): PrivacyRisk[] {
  const risks: PrivacyRisk[] = [];
  let remaining = text;
  for (const { type, pattern, replacement } of PATTERNS) {
    const matcher = new RegExp(pattern.source, pattern.flags);
    const count = [...remaining.matchAll(matcher)].length;
    if (count > 0) {
      risks.push({ type, count });
      remaining = remaining.replace(new RegExp(pattern.source, pattern.flags), replacement);
    }
  }
  return risks;
}

export function redactSensitiveData(text: string): string {
  return PATTERNS.reduce((result, item) => result.replace(new RegExp(item.pattern.source, item.pattern.flags), item.replacement), text);
}
