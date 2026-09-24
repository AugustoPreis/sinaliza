import { normalizeText } from '../preprocessing/normalize.js';
import { RandomForestClassifier, type RandomForestArtifact } from '../random-forest/classifier.js';
import { AI_CONFIG } from '../config/ai.js';
import type { ModelMetadata, Prediction, SectorId, TrainingMetadataInput } from '../shared/types.js';
import { readJson, writeJson } from '../shared/utils.js';
import { embedTexts, MINILM_MODEL_ID } from './embeddings.js';

export interface MinilmModelArtifact {
  artifactSchema: 1;
  modelName: 'minilm-rf';
  transformerModel: string;
  dimensions: 384;
  pooling: 'mean';
  normalized: true;
  classifier: RandomForestArtifact;
  metadata: ModelMetadata;
}

export async function trainMinilmModel(texts: string[], labels: SectorId[], provenance?: TrainingMetadataInput): Promise<MinilmModelArtifact> {
  const features = await embedTexts(texts.map((text) => normalizeText(text)));
  const classifier = new RandomForestClassifier([...new Set(labels)], {
    nEstimators: AI_CONFIG.randomForest.nEstimators,
    maxFeatures: AI_CONFIG.randomForest.maxFeatures,
    seed: AI_CONFIG.seed,
    maxDepth: AI_CONFIG.randomForest.maxDepth,
  });
  classifier.train(features, labels);
  return {
    artifactSchema: 1, modelName: 'minilm-rf', transformerModel: MINILM_MODEL_ID,
    dimensions: 384, pooling: 'mean', normalized: true, classifier: classifier.toArtifact(),
    metadata: {
      modelVersion: provenance?.modelVersion ?? 'test-only', trainedAt: new Date().toISOString(), datasetVersion: provenance?.datasetVersion ?? 'test-only',
      datasetPath: provenance?.datasetPath ?? 'in-memory', datasetHash: provenance?.datasetHash ?? 'not-available',
      datasetTotalSamples: provenance?.datasetTotalSamples ?? labels.length, trainSamples: provenance?.trainSamples ?? labels.length,
      validationSamples: provenance?.validationSamples ?? 0, testSamples: provenance?.testSamples ?? 0,
      modelType: 'minilm-random-forest', sectorIds: provenance?.sectorIds ?? [...new Set(labels)],
      sectorCount: provenance?.sectorCount ?? new Set(labels).size, seed: provenance?.seed ?? AI_CONFIG.seed,
      dependencies: { '@huggingface/transformers': '4.x', 'ml-random-forest': '2.x' },
      dataSource: provenance?.dataSource ?? 'MOCK',
      configuration: { algorithm: 'random-forest', transformerModel: MINILM_MODEL_ID, pooling: 'mean', normalized: true },
    },
  };
}

export async function predictWithMinilm(artifact: MinilmModelArtifact, text: string): Promise<Prediction> {
  if (!text.trim()) throw new Error('A descrição é obrigatória.');
  if (artifact.transformerModel !== MINILM_MODEL_ID) throw new Error(`Modelo transformer incompatível: ${artifact.transformerModel}`);
  const classifier = RandomForestClassifier.fromArtifact(artifact.classifier);
  const [result] = classifier.predict(await embedTexts([normalizeText(text)]));
  if (!result) throw new Error('O classificador não retornou uma previsão.');
  return { ...result, model: artifact.modelName };
}

export async function saveMinilmModel(path: string, artifact: MinilmModelArtifact): Promise<void> { await writeJson(path, artifact); }
export async function loadMinilmModel(path: string): Promise<MinilmModelArtifact> {
  let value: unknown;
  try { value = await readJson<unknown>(path); } catch (error) { throw new Error(`Não foi possível carregar o modelo MiniLM: ${path}`, { cause: error }); }
  const item = value as Partial<MinilmModelArtifact>;
  if (!item || item.artifactSchema !== 1 || item.modelName !== 'minilm-rf' || item.transformerModel !== MINILM_MODEL_ID ||
      item.dimensions !== 384 || item.pooling !== 'mean' || item.normalized !== true || !item.classifier ||
      !Array.isArray(item.classifier.classes) || item.classifier.classes.length === 0 || !item.classifier.model ||
      !item.metadata || item.metadata.modelType !== 'minilm-random-forest' || !Array.isArray(item.metadata.sectorIds) || !item.metadata.datasetHash) {
    throw new Error(`Artefato MiniLM inválido ou incompatível: ${path}`);
  }
  return item as MinilmModelArtifact;
}
