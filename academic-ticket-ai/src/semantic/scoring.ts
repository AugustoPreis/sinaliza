export interface SemanticReference { sectorId: string; vector: number[] }
export function rankSectors(vector: number[], references: SemanticReference[], classes: string[], neighbors: number) {
  return classes.map(sectorId => {
    const scores = references.filter(reference => reference.sectorId === sectorId)
      .map(reference => reference.vector.reduce((sum, value, index) => sum + value * vector[index]!, 0)).sort((a, b) => b - a).slice(0, neighbors);
    return { sectorId, score: scores.reduce((a, b) => a + b, 0) / scores.length };
  }).sort((a, b) => b.score - a.score);
}
