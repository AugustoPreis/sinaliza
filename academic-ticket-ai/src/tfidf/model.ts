import { prepareDescription, descriptionChunks } from '../preprocessing/description.js';
import { semanticEmbeddings, SEMANTIC_MODEL, SEMANTIC_REVISION } from '../semantic/embeddings.js';
import { hybridRanking, reviewDecision, type HybridConfiguration } from '../semantic/hybrid.js';
import { normalizeText } from '../preprocessing/normalize.js';
import { correctSpelling } from '../preprocessing/spell-checker.js';
import { RandomForestClassifier, type ClassifierAlgorithm, type RandomForestArtifact } from '../random-forest/classifier.js';
import { AI_CONFIG } from '../config/ai.js';
import type { ModelMetadata, Prediction, SectorId, TfidfMode, TrainingMetadataInput } from '../shared/types.js';
import { readJson, writeJson } from '../shared/utils.js';
import { TfidfVectorizer, type TfidfArtifact } from './vectorizer.js';

export interface TfidfModelArtifact {
  artifactSchema: 1;
  modelName: string;
  spellCheck: boolean;
  vectorizer: TfidfArtifact;
  classifier: RandomForestArtifact;
  metadata: ModelMetadata;
  semantic?: HybridConfiguration;
}

async function preprocess(text: string, spellCheck: boolean): Promise<string> {
  const normalized = normalizeText(text);
  return spellCheck ? correctSpelling(normalized) : normalized;
}

export async function trainTfidfModel(
  texts: string[], labels: SectorId[], mode: TfidfMode, spellCheck = false, provenance?: TrainingMetadataInput, centroidsPerClass = 1, algorithm: ClassifierAlgorithm = 'random-forest',
): Promise<TfidfModelArtifact> {
  const processed = await Promise.all(texts.map((text) => preprocess(text, spellCheck)));
  const vectorizer = new TfidfVectorizer({ mode });
  const features = vectorizer.fitTransform(processed);
  const classifier = new RandomForestClassifier([...new Set(labels)], {
    nEstimators: AI_CONFIG.randomForest.nEstimators,
    maxFeatures: AI_CONFIG.randomForest.maxFeatures,
    seed: AI_CONFIG.seed,
    maxDepth: AI_CONFIG.randomForest.maxDepth,
    centroidsPerClass, algorithm,
  });
  classifier.train(features, labels);
  return {
    artifactSchema: 1,
    modelName: `${spellCheck ? 'nspell-' : ''}tfidf-${mode}-${algorithm === 'centroid' ? 'centroid' : 'rf'}`, spellCheck,
    vectorizer: vectorizer.getArtifact(), classifier: classifier.toArtifact(),
    metadata: {
      modelVersion: provenance?.modelVersion ?? 'test-only', trainedAt: new Date().toISOString(), datasetVersion: provenance?.datasetVersion ?? 'test-only',
      datasetPath: provenance?.datasetPath ?? 'in-memory', datasetHash: provenance?.datasetHash ?? 'not-available',
      datasetTotalSamples: provenance?.datasetTotalSamples ?? labels.length, trainSamples: provenance?.trainSamples ?? labels.length,
      validationSamples: provenance?.validationSamples ?? 0, testSamples: provenance?.testSamples ?? 0,
      modelType: algorithm === 'centroid' ? 'tfidf-centroid' : 'tfidf-random-forest', sectorIds: provenance?.sectorIds ?? [...new Set(labels)],
      sectorCount: provenance?.sectorCount ?? new Set(labels).size, seed: provenance?.seed ?? AI_CONFIG.seed,
      dependencies: { 'ml-random-forest': '2.x' }, configuration: { mode, spellCheck, algorithm },
      dataSource: provenance?.dataSource ?? 'MOCK',
    },
  };
}

export async function predictWithTfidf(artifact: TfidfModelArtifact, text: string): Promise<Prediction> {
  if (!text.trim()) throw new Error('A descrição é obrigatória.');
  const vectorizer = TfidfVectorizer.fromArtifact(artifact.vectorizer);
  const prepared = artifact.semantic ? await prepareDescription(text) : undefined;
  const features = vectorizer.transform([prepared?.text ?? await preprocess(text, artifact.spellCheck)]);
  if (artifact.semantic) {
    const chunks = descriptionChunks(prepared!.text);
    const embeddings = await semanticEmbeddings(chunks);
    const embedding = Array<number>(384).fill(0);
    for (let chunk = 0; chunk < embeddings.length; chunk++) {
      for (let i = 0; i < 384; i++) embedding[i] = embedding[i]! + embeddings[chunk]![i]! * chunks[chunk]!.length;
    }
    const norm = Math.sqrt(embedding.reduce((sum, value) => sum + value * value, 0)) || 1;
    for (let i = 0; i < embedding.length; i++) embedding[i] = embedding[i]! / norm;
    const rows = hybridRanking(features[0]!, embedding!, artifact.classifier, artifact.semantic.references, artifact.semantic.neighbors, artifact.semantic.weight);
    const reason = reviewDecision(rows, artifact.semantic);
    return { sectorId: rows[0]!.sectorId, confidence: rows[0]!.score, model: artifact.modelName,
      processing: { normalization: 'unicode-whitespace-lowercase-v1', corrected_tokens: prepared!.correctedTokens, semantic_chunks: chunks.length },
      requiresReview: Boolean(reason), reviewReason: reason,
      alternatives: rows.slice(0, 3).map(({ sectorId, score }) => ({ sectorId, score })) };
  }
  const classifier = RandomForestClassifier.fromArtifact(artifact.classifier);
  const [result] = classifier.predict(features);
  if (!result) throw new Error('O classificador não retornou uma previsão.');
  return { ...result, model: artifact.modelName };
}

export async function saveTfidfModel(path: string, artifact: TfidfModelArtifact): Promise<void> { await writeJson(path, artifact); }
export async function loadTfidfModel(path: string): Promise<TfidfModelArtifact> {
  let value: unknown;
  try { value = await readJson<unknown>(path); } catch (error) { throw new Error(`Não foi possível carregar o modelo TF-IDF: ${path}`, { cause: error }); }
  const item = value as Partial<TfidfModelArtifact>;
  if (!item || item.artifactSchema !== 1 || typeof item.modelName !== 'string' || typeof item.spellCheck !== 'boolean' ||
      !item.vectorizer || !Array.isArray(item.vectorizer.vocabulary) || !Array.isArray(item.vectorizer.idf) ||
      !item.classifier || !Array.isArray(item.classifier.classes) || item.classifier.classes.length === 0 || (!item.classifier.model && !item.classifier.centroids) ||
      !item.metadata || !['tfidf-random-forest', 'tfidf-centroid', 'tfidf-semantic'].includes(item.metadata.modelType ?? '') || !Array.isArray(item.metadata.sectorIds) || !item.metadata.datasetHash) {
    throw new Error(`Artefato TF-IDF inválido ou incompatível: ${path}`);
  }
  if (Boolean(item.semantic) !== (item.metadata.modelType === 'tfidf-semantic')) throw new Error('Configuração híbrida incompatível.');
  if (item.semantic) {
    const config = item.semantic;
    const unit = (value: number) => Number.isFinite(value) && value >= 0 && value <= 1;
    if (config.transformerModel !== SEMANTIC_MODEL || config.transformerRevision !== SEMANTIC_REVISION ||
      !Number.isInteger(config.neighbors) || config.neighbors < 1 || !unit(config.weight) ||
      !unit(config.minimumSemanticScore) || !unit(config.minimumMargin) ||
      !item.classifier.centroids || item.classifier.centroids.length !== item.classifier.classes.length ||
      !Array.isArray(config.references) || item.classifier.classes.some(id => !config.references.some(reference => reference.sectorId === id)) ||
      config.references.some(reference => !item.classifier!.classes.includes(reference.sectorId) || !Array.isArray(reference.vector) ||
        reference.vector.length !== 384 || reference.vector.some(value => typeof value !== 'number' || !Number.isFinite(value)))) {
      throw new Error('Artefato híbrido inválido ou incompatível.');
    }
  }
  return item as TfidfModelArtifact;
}
