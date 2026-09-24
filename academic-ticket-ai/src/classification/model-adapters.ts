import { loadMinilmModel, predictWithMinilm, type MinilmModelArtifact } from '../minilm/model.js';
import { loadTfidfModel, predictWithTfidf, type TfidfModelArtifact } from '../tfidf/model.js';
import type { ClassifierService } from './service.js';

export class TfidfClassifierService implements ClassifierService {
  readonly modelSectorIds: string[];
  private constructor(private readonly artifact: TfidfModelArtifact) { this.modelSectorIds = [...artifact.classifier.classes]; }
  static async load(path: string): Promise<TfidfClassifierService> { return new TfidfClassifierService(await loadTfidfModel(path)); }
  classify(description: string) { return predictWithTfidf(this.artifact, description); }
}

export class MinilmClassifierService implements ClassifierService {
  readonly modelSectorIds: string[];
  private constructor(private readonly artifact: MinilmModelArtifact) { this.modelSectorIds = [...artifact.classifier.classes]; }
  static async load(path: string): Promise<MinilmClassifierService> { return new MinilmClassifierService(await loadMinilmModel(path)); }
  classify(description: string) { return predictWithMinilm(this.artifact, description); }
}
