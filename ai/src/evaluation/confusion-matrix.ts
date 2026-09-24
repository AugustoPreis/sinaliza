function abbreviation(value: string): string { return value.split(/\s+/).map((part) => part[0]).join('').slice(0, 4); }

export function formatConfusionMatrix(matrix: number[][], classIds: string[]): string {
  const width = 7;
  const header = `${''.padEnd(18)}${classIds.map((sector) => abbreviation(sector).padStart(width)).join('')}`;
  const rows = classIds.map((sector, index) =>
    `Real ${abbreviation(sector)}`.padEnd(18) + (matrix[index] ?? []).map((value) => String(value).padStart(width)).join(''),
  );
  return [`${''.padEnd(18)}Previsto`, header, ...rows].join('\n');
}
