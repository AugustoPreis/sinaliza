import { HttpStatus } from '@nestjs/common';

import { AppException } from '@shared/exceptions';

import { SectorEntity } from '@modules/sectors/entities/sector.entity';

export interface IClassificationDetails {
  schema_version: 1;
  request_id: string;
  model: string;
  model_version: string;
  method: string;
  data_source: 'MOCK' | 'REAL';
  score_type: 'uncalibrated_score';
  requires_review: boolean;
  review_reason: string | null;
  alternatives: Array<{ id: string; name: string; score: number }>;
  decision?: { minimum_score: number; minimum_margin: number; margin: number };
  processing?: { normalization: string; corrected_tokens: number; semantic_chunks: number };
}

export function parseClassificationDetails(
  value: unknown,
  sectors: SectorEntity[],
  source: unknown,
): IClassificationDetails | undefined {
  if (value === undefined) return undefined; // Compatibilidade com serviços anteriores ao contrato v1.
  const record = (v: unknown): v is Record<string, unknown> =>
    typeof v === 'object' && v !== null && !Array.isArray(v);
  const text = (v: unknown): v is string =>
    typeof v === 'string' && v.trim().length > 0 && v.length <= 200;
  const integer = (v: unknown): v is number =>
    typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 2000;
  if (
    !record(value) ||
    value.schema_version !== 1 ||
    !text(value.request_id) ||
    !text(value.model) ||
    !text(value.model_version) ||
    !text(value.method) ||
    !['MOCK', 'REAL'].includes(String(value.data_source)) ||
    value.data_source !== source ||
    value.score_type !== 'uncalibrated_score' ||
    typeof value.requires_review !== 'boolean' ||
    (value.requires_review
      ? ![
          'insufficient_context',
          'model_disagreement',
          'close_scores',
          'uncalibrated_model',
        ].includes(String(value.review_reason))
      : value.review_reason !== null) ||
    !Array.isArray(value.alternatives) ||
    value.alternatives.length > sectors.length
  ) {
    throw AppException.from('classification.errors.INVALID_CLASSIFICATION_DETAILS', HttpStatus.BAD_GATEWAY, { code: 'INVALID_CLASSIFICATION_DETAILS' });
  }
  const seen = new Set<string>();
  const alternatives = value.alternatives.map((item: unknown) => {
    if (
      !record(item) ||
      typeof item.id !== 'string' ||
      typeof item.score !== 'number' ||
      !Number.isFinite(item.score) ||
      item.score < 0 ||
      item.score > 1 ||
      seen.has(item.id)
    )
      throw AppException.from('classification.errors.INVALID_CLASSIFICATION_DETAILS', HttpStatus.BAD_GATEWAY, { code: 'INVALID_CLASSIFICATION_DETAILS' });
    const sector = sectors.find((sector) => sector.uuid === item.id);
    if (!sector) throw AppException.from('classification.errors.INVALID_CLASSIFICATION_DETAILS', HttpStatus.BAD_GATEWAY, { code: 'INVALID_CLASSIFICATION_DETAILS' });
    seen.add(item.id);
    return { id: sector.uuid, name: sector.name, score: item.score };
  });
  let processing: IClassificationDetails['processing'];
  if (value.processing !== undefined) {
    const item = value.processing;
    if (
      !record(item) ||
      !text(item.normalization) ||
      !integer(item.corrected_tokens) ||
      !integer(item.semantic_chunks) ||
      item.semantic_chunks < 1
    )
      throw AppException.from('classification.errors.INVALID_CLASSIFICATION_DETAILS', HttpStatus.BAD_GATEWAY, { code: 'INVALID_CLASSIFICATION_DETAILS' });
    processing = {
      normalization: item.normalization,
      corrected_tokens: item.corrected_tokens,
      semantic_chunks: item.semantic_chunks,
    };
  }
  let decision: IClassificationDetails['decision'];
  if (value.decision !== undefined) {
    const d = value.decision;
    if (!record(d) || ![d.minimum_score, d.minimum_margin, d.margin].every(n => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 1)) throw AppException.from('classification.errors.INVALID_CLASSIFICATION_DETAILS', HttpStatus.BAD_GATEWAY, { code: 'INVALID_CLASSIFICATION_DETAILS' });
    decision = { minimum_score: d.minimum_score as number, minimum_margin: d.minimum_margin as number, margin: d.margin as number };
  }
  return {
    schema_version: 1,
    request_id: value.request_id,
    model: value.model,
    model_version: value.model_version,
    method: value.method,
    data_source: value.data_source as 'MOCK' | 'REAL',
    score_type: 'uncalibrated_score',
    requires_review: value.requires_review,
    review_reason: value.review_reason as string | null,
    alternatives,
    ...(processing ? { processing } : {}),
    ...(decision ? { decision } : {}),
  };
}
