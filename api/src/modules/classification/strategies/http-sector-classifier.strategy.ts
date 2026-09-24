import { parseClassificationDetails } from './classification-details';
import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AppException } from '@shared/exceptions';

import { SectorEntity } from '@modules/sectors/entities/sector.entity';

import { IClassificationResult, ISectorClassifierStrategy } from './sector-classifier.strategy';

@Injectable()
export class HttpSectorClassifierStrategy implements ISectorClassifierStrategy {
  private readonly mode: string;
  private readonly url: string;
  private readonly token: string;
  private readonly timeout: number;

  constructor(config: ConfigService) {
    this.mode = config.get<string>('AI_MODE', 'disabled');
    this.url = config.get<string>('AI_SERVICE_URL', '');
    this.token = config.get<string>('AI_SERVICE_TOKEN', '');
    this.timeout = Number(config.get('AI_TIMEOUT_MS', 15000));
    if (!['disabled', 'mock', 'trained'].includes(this.mode))
      throw AppException.from(
        'classification.errors.INVALID_CONFIGURATION',
        HttpStatus.INTERNAL_SERVER_ERROR,
        { code: 'INVALID_CONFIGURATION' },
      );
    if (config.get('NODE_ENV') === 'production' && this.mode === 'mock')
      throw AppException.from(
        'classification.errors.MOCK_MODEL_NOT_ALLOWED',
        HttpStatus.INTERNAL_SERVER_ERROR,
        { code: 'MOCK_MODEL_NOT_ALLOWED' },
      );
    if (this.mode !== 'disabled') {
      const url = new URL(this.url);
      if (
        !['http:', 'https:'].includes(url.protocol) ||
        url.username ||
        url.password ||
        url.search ||
        url.hash
      )
        throw AppException.from(
          'classification.errors.INVALID_CONFIGURATION',
          HttpStatus.INTERNAL_SERVER_ERROR,
          { code: 'INVALID_CONFIGURATION' },
        );
      if (this.token.length < 32)
        throw AppException.from(
          'classification.errors.INVALID_CONFIGURATION',
          HttpStatus.INTERNAL_SERVER_ERROR,
          { code: 'INVALID_CONFIGURATION' },
        );
      if (!Number.isInteger(this.timeout) || this.timeout <= 0)
        throw AppException.from(
          'classification.errors.INVALID_CONFIGURATION',
          HttpStatus.INTERNAL_SERVER_ERROR,
          { code: 'INVALID_CONFIGURATION' },
        );
    }
  }

  async classify(description: string, sectors: SectorEntity[]): Promise<IClassificationResult> {
    if (this.mode === 'disabled')
      throw AppException.from(
        'classification.errors.CLASSIFICATION_DISABLED',
        HttpStatus.SERVICE_UNAVAILABLE,
        { code: 'CLASSIFICATION_DISABLED' },
      );
    let response: Response;
    let payload: unknown;
    try {
      response = await fetch(`${this.url.replace(/\/$/, '')}/classification/preview`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${this.token}` },
        body: JSON.stringify({ description }),
        signal: AbortSignal.timeout(this.timeout),
        redirect: 'error',
      });
      payload = await response.json();
    } catch {
      throw AppException.from(
        'classification.errors.CLASSIFICATION_UNAVAILABLE',
        HttpStatus.SERVICE_UNAVAILABLE,
        { code: 'CLASSIFICATION_UNAVAILABLE' },
      );
    }
    const result = payload as {
      code?: unknown;
      sector_id?: unknown;
      confidence?: unknown;
      dataSource?: unknown;
      classification?: unknown;
    } | null;
    if (response.status === 409 && result?.code === 'MODEL_SECTORS_INCOMPATIBLE')
      throw AppException.from(
        'classification.errors.MODEL_SECTORS_INCOMPATIBLE',
        HttpStatus.CONFLICT,
        { code: 'MODEL_SECTORS_INCOMPATIBLE' },
      );
    if (!response.ok)
      throw AppException.from(
        'classification.errors.CLASSIFICATION_UNAVAILABLE',
        HttpStatus.SERVICE_UNAVAILABLE,
        { code: 'CLASSIFICATION_UNAVAILABLE' },
      );
    if (!result || result.dataSource !== (this.mode === 'trained' ? 'REAL' : 'MOCK'))
      throw AppException.from(
        'classification.errors.MODEL_SOURCE_MISMATCH',
        HttpStatus.BAD_GATEWAY,
        { code: 'MODEL_SOURCE_MISMATCH' },
      );
    const sector = sectors.find((item) => item.uuid === result.sector_id);
    if (!sector)
      throw AppException.from(
        'classification.errors.INVALID_CLASSIFICATION_SECTOR',
        HttpStatus.BAD_GATEWAY,
        { code: 'INVALID_CLASSIFICATION_SECTOR' },
      );
    if (
      result.confidence !== undefined &&
      (typeof result.confidence !== 'number' ||
        !Number.isFinite(result.confidence) ||
        result.confidence < 0 ||
        result.confidence > 1)
    )
      throw AppException.from(
        'classification.errors.INVALID_CLASSIFICATION_CONFIDENCE',
        HttpStatus.BAD_GATEWAY,
        { code: 'INVALID_CLASSIFICATION_CONFIDENCE' },
      );
    try {
      const classification = parseClassificationDetails(
        result.classification,
        sectors,
        result.dataSource,
      );
      return {
        sector,
        confidence: result.confidence,
        ...(classification ? { classification } : {}),
      };
    } catch {
      throw AppException.from(
        'classification.errors.INVALID_CLASSIFICATION_DETAILS',
        HttpStatus.BAD_GATEWAY,
        { code: 'INVALID_CLASSIFICATION_DETAILS' },
      );
    }
  }
}
