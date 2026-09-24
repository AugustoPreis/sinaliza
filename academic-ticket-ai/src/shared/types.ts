export type SectorId = string;

export interface SectorDefinition {
  id: SectorId;
  name: string;
  active: boolean;
  examples: string[];
}

export interface TicketRecord {
  originalText: string;
  sectorId: SectorId;
  sourceExampleId: string;
  groupId: string;
}

export interface ProcessedTicket extends TicketRecord {
  normalizedText: string;
}

export interface DatasetSplit<T> {
  train: T[];
  validation: T[];
  test: T[];
}

export interface Prediction {
  sectorId: SectorId;
  confidence: number;
  model: string;
  processing?: { normalization: string; corrected_tokens: number; semantic_chunks: number };
  requiresReview?: boolean;
  reviewReason?: string;
  alternatives?: Array<{ sectorId: string; score: number }>;
}

export interface ClassMetrics {
  precision: number;
  recall: number;
  f1: number;
  support: number;
}

export interface EvaluationMetrics {
  accuracy: number;
  macroF1: number;
  weightedF1: number;
  perClass: Record<SectorId, ClassMetrics>;
  confusionMatrix: number[][];
  classIds: SectorId[];
}

export interface ModelMetadata {
  modelVersion: string;
  trainedAt: string;
  datasetVersion: string;
  sectorIds: SectorId[];
  sectorCount: number;
  datasetPath: string;
  datasetHash: string;
  datasetTotalSamples: number;
  trainSamples: number;
  validationSamples: number;
  testSamples: number;
  modelType: string;
  seed: number;
  metrics?: Partial<EvaluationMetrics>;
  dependencies: Record<string, string>;
  configuration: Record<string, unknown>;
  /** Origem dos dados: modelos MOCK nunca devem ser tratados como produção. */
  dataSource?: 'MOCK' | 'REAL';
}

export type TrainingMetadataInput = Omit<ModelMetadata, 'trainedAt' | 'dependencies' | 'configuration' | 'metrics'>;

export type TfidfMode = 'word' | 'char' | 'combined';
