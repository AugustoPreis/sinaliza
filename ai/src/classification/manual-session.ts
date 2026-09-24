export class ManualSession {
  private entries: Array<{ predicted: string; expected?: string; review: boolean }> = [];
  addPrediction(predicted: string, review = false): void { this.entries.push({ predicted, review }); }
  markExpected(expected: string): void {
    const last = this.entries.at(-1);
    if (!last) throw new Error('Digite um chamado antes de avaliar.');
    last.expected = expected;
  }
  lastPrediction(): string {
    const last = this.entries.at(-1);
    if (!last) throw new Error('Digite um chamado antes de avaliar.');
    return last.predicted;
  }
  summary() {
    const evaluated = this.entries.filter(entry => entry.expected !== undefined);
    const correct = evaluated.filter(entry => entry.predicted === entry.expected).length;
    return { total: this.entries.length, evaluated: evaluated.length, correct, incorrect: evaluated.length - correct,
      pending: this.entries.length - evaluated.length, requiresReview: this.entries.filter(entry => entry.review).length,
      accuracy: evaluated.length ? correct / evaluated.length : null };
  }
}
export function resolveManualSector(input: string, sectors: string[]): string {
  const normalize = (value: string) => value.trim().normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('pt-BR');
  const key = normalize(input);
  const index = /^\d+$/.test(key) ? Number(key) - 1 : -1;
  const sector = sectors[index] ?? sectors.find(sector => normalize(sector) === key);
  if (!sector) throw new Error('Setor inválido. Use /setores e informe o número ou nome completo.');
  return sector;
}
