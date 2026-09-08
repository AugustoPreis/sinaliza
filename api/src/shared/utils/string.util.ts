export function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/\s+/g, '-')
    .toLowerCase();
}

export function toPascalCase(str: string): string {
  return str
    .replace(/[-_\s]+(.)?/g, (_, c: string) => (c ? c.toUpperCase() : ''))
    .replace(/^(.)/, (c) => c.toUpperCase());
}

export function maskDocument(document: string): string {
  return document.replace(/\d(?=\d{4})/g, '*');
}

export function normalizeWhitespace(str: string): string {
  return str.trim().replace(/\s+/g, ' ');
}
