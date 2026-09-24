import { RandomForestClassifier as MlRandomForestClassifier } from 'ml-random-forest';
import type { SectorId } from '../shared/types.js';

export type ClassifierAlgorithm = 'random-forest' | 'centroid';
export interface RandomForestOptions { algorithm?: ClassifierAlgorithm; nEstimators?: number; maxFeatures?: number; seed?: number; maxDepth?: number; centroidsPerClass?: number }
type MlRandomForestModel = ReturnType<MlRandomForestClassifier['toJSON']>;
export interface RandomForestArtifact { model?: MlRandomForestModel; classes: SectorId[]; options: Required<RandomForestOptions>; centroids?: number[][]; centroidLabels?: number[] }

export class RandomForestClassifier {
  private model?: MlRandomForestClassifier;
  private centroids?: number[][];
  private centroidLabels?: number[];
  private readonly classes: SectorId[];
  private readonly options: Required<RandomForestOptions>;

  constructor(classes: SectorId[], options: RandomForestOptions = {}, model?: MlRandomForestClassifier) {
    this.classes = [...classes];
    // Zero significa a heurística clássica sqrt(n_features), resolvida no treino.
    this.options = { algorithm: 'random-forest', nEstimators: 100, maxFeatures: 0, seed: 42, maxDepth: 20, centroidsPerClass: 1, ...options };
    this.model = model;
  }

  train(features: number[][], labels: SectorId[]): void {
    if (features.length !== labels.length || features.length === 0) throw new Error('Features e rótulos devem possuir o mesmo tamanho não vazio.');
    if (!['random-forest', 'centroid'].includes(this.options.algorithm)) throw new Error('Algoritmo inválido.');
    if (!Number.isInteger(this.options.nEstimators) || this.options.nEstimators < 1) throw new Error('Número de árvores inválido.');
    this.model = undefined; this.centroids = undefined; this.centroidLabels = undefined;
    const encoded = labels.map((label) => {
      const index = this.classes.indexOf(label);
      if (index < 0) throw new Error(`Classe desconhecida: ${label}`);
      return index;
    });
    const featureCount = features[0]?.length ?? 0;
    if (featureCount === 0 || features.some((row) => row.length !== featureCount)) throw new Error('Matriz de features vazia ou irregular.');
    const maxFeatures = this.options.maxFeatures > 0 ? this.options.maxFeatures : Math.max(1, Math.floor(Math.sqrt(featureCount)));
    if (this.options.algorithm === 'centroid') {
      const grouped = new Map<string, number[]>();
      labels.forEach((label, index) => grouped.set(label, [...(grouped.get(label) ?? []), index]));
      this.centroids = []; this.centroidLabels = [];
      for (const [classId, indexes] of grouped) {
        const k = Math.min(this.options.centroidsPerClass, indexes.length);
        const buckets = Array.from({ length: k }, () => [] as number[]);
        indexes.forEach((index, position) => buckets[position % k]!.push(index));
        for (const bucket of buckets) {
          const centroid = Array.from({ length: featureCount }, () => 0);
          for (const index of bucket) for (let feature = 0; feature < featureCount; feature++) centroid[feature] = (centroid[feature] ?? 0) + (features[index]?.[feature] ?? 0);
          const norm = Math.sqrt(centroid.reduce((sum, value) => sum + value * value, 0)) || 1;
          this.centroids.push(centroid.map((value) => value / norm)); this.centroidLabels.push(this.classes.indexOf(classId));
        }
      }
      /* Keep one representative per class when the legacy option is used. */
      if (this.options.centroidsPerClass === 1) this.centroids = this.classes.map((classId) => {
        const indexes = labels.map((label, index) => label === classId ? index : -1).filter((index) => index >= 0);
        const centroid = Array.from({ length: featureCount }, () => 0);
        for (const index of indexes) for (let feature = 0; feature < featureCount; feature++) centroid[feature] = (centroid[feature] ?? 0) + (features[index]?.[feature] ?? 0);
        const norm = Math.sqrt(centroid.reduce((sum, value) => sum + value * value, 0)) || 1;
        return centroid.map((value) => value / norm);
      });
      if (this.options.centroidsPerClass === 1) this.centroidLabels = this.classes.map((_, index) => index);
      return;
    }
    this.model = new MlRandomForestClassifier({
      nEstimators: this.options.nEstimators,
      maxFeatures,
      seed: this.options.seed,
      replacement: true,
      useSampleBagging: true,
      noOOB: true,
      treeOptions: { minNumSamples: 1, maxDepth: this.options.maxDepth },
    });
    this.model.train(features, encoded);
  }

  predict(features: number[][]): Array<{ sectorId: SectorId; confidence: number }> {
    if (!this.model && !this.centroids) throw new Error('Random Forest ainda não foi treinada.');
    if (this.centroids) return features.map((row) => {
      const norm = Math.sqrt(row.reduce((sum, value) => sum + value * value, 0)) || 1;
      const scores = this.centroids!.map((centroid) => centroid.reduce((sum, value, index) => sum + value * (row[index] ?? 0) / norm, 0));
      const bestByClass = this.classes.map((_, classIndex) => Math.max(...scores.map((score, i) => this.centroidLabels![i] === classIndex ? score : -Infinity)));
      const label = bestByClass.reduce((best, score, index) => score > bestByClass[best]! ? index : best, 0);
      // Centroid and input are L2-normalized: the winning dot product is cosine similarity.
      // Min/max normalization made every winner equal to 1, including zero-signal inputs.
      return { sectorId: this.classes[label]!, confidence: Math.max(0, Math.min(1, bestByClass[label]!)) };
    });
    const labels = this.model!.predict(features);
    return labels.map((label, row) => {
      const probabilities = this.classes.map((_, classIndex) => this.model!.predictProbability([features[row]!], classIndex)[0] ?? 0);
      const total = probabilities.reduce((sum, probability) => sum + probability, 0);
      const confidence = total > 0 ? probabilities[label]! / total : 0;
      return { sectorId: this.classes[label]!, confidence };
    });
  }

  toArtifact(): RandomForestArtifact {
    if (!this.model && !this.centroids) throw new Error('Random Forest ainda não foi treinada.');
    return { model: this.model?.toJSON(), centroids: this.centroids, centroidLabels: this.centroidLabels, classes: [...this.classes], options: this.options };
  }

  static fromArtifact(artifact: RandomForestArtifact): RandomForestClassifier {
    if (Boolean(artifact.model) === Boolean(artifact.centroids)) throw new Error('Artefato deve conter exatamente um algoritmo.');
    const algorithm = artifact.centroids ? 'centroid' : 'random-forest';
    if (artifact.options.algorithm && artifact.options.algorithm !== algorithm) throw new Error('Algoritmo declarado diverge do artefato.');
    const classifier = new RandomForestClassifier(artifact.classes, { ...artifact.options, algorithm }, artifact.model ? MlRandomForestClassifier.load(artifact.model) : undefined);
    classifier.centroids = artifact.centroids;
    classifier.centroidLabels = artifact.centroidLabels ?? artifact.classes.map((_, index) => index);
    return classifier;
  }
}
