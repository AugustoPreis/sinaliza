export interface NormalizeOptions { lowercase?: boolean }

export function normalizeText(text: string, options: NormalizeOptions = {}): string {
  const normalized = text
    .normalize('NFC')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
  return options.lowercase === false ? normalized : normalized.toLocaleLowerCase('pt-BR');
}
