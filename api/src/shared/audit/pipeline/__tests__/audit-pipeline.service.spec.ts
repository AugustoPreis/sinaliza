import { mockDeep } from 'jest-mock-extended';

import {
  IAuditChangeSetContext,
  IAuditEntityMetadata,
  IAuditRecordContext,
} from '../../interfaces';
import { AuditMetadataRegistry } from '../../registry/audit-metadata.registry';
import { I18nAuditTranslator } from '../../translators/i18n-audit.translator';
import { stringifyUnknown } from '../../utils/stringify.util';
import { AuditPipelineService } from '../audit-pipeline.service';
import { BuildDtoStage } from '../stages/build-dto.stage';
import { DiffStage } from '../stages/diff.stage';
import { FormatStage } from '../stages/format.stage';
import { LoadMetadataStage } from '../stages/load-metadata.stage';
import { NormalizeStage } from '../stages/normalize.stage';
import { ResolveRelationsStage } from '../stages/resolve-relations.stage';
import { TranslateStage } from '../stages/translate.stage';

function buildMetadata(): IAuditEntityMetadata {
  return {
    target: class User {},
    name: 'user',
    module: 'users',
    label: 'User',
    fields: new Map(),
  };
}

function buildService(): {
  service: AuditPipelineService;
  loadMetadataStage: ReturnType<typeof mockDeep<LoadMetadataStage>>;
  normalizeStage: ReturnType<typeof mockDeep<NormalizeStage>>;
  diffStage: ReturnType<typeof mockDeep<DiffStage>>;
  resolveRelationsStage: ReturnType<typeof mockDeep<ResolveRelationsStage>>;
  translateStage: ReturnType<typeof mockDeep<TranslateStage>>;
  formatStage: ReturnType<typeof mockDeep<FormatStage>>;
  buildDtoStage: ReturnType<typeof mockDeep<BuildDtoStage>>;
  translator: ReturnType<typeof mockDeep<I18nAuditTranslator>>;
} {
  const loadMetadataStage = mockDeep<LoadMetadataStage>();
  const normalizeStage = mockDeep<NormalizeStage>();
  const diffStage = mockDeep<DiffStage>();
  const resolveRelationsStage = mockDeep<ResolveRelationsStage>();
  const translateStage = mockDeep<TranslateStage>();
  const formatStage = mockDeep<FormatStage>();
  const buildDtoStage = mockDeep<BuildDtoStage>();
  const translator = mockDeep<I18nAuditTranslator>();

  const service = new AuditPipelineService(
    loadMetadataStage,
    normalizeStage,
    diffStage,
    resolveRelationsStage,
    translateStage,
    formatStage,
    buildDtoStage,
    translator,
  );

  return {
    service,
    loadMetadataStage,
    normalizeStage,
    diffStage,
    resolveRelationsStage,
    translateStage,
    formatStage,
    buildDtoStage,
    translator,
  };
}

describe('AuditPipelineService', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('recordChange', () => {
    it('runs LoadMetadata -> Normalize -> Diff in order, threading each output into the next stage', async () => {
      const { service, loadMetadataStage, normalizeStage, diffStage } = buildService();

      const input = {
        entityName: 'user',
        entityUuid: 'uuid-1',
        actorUuid: null,
        action: 'update',
        before: null,
        after: null,
      };
      const afterLoad: IAuditRecordContext = { input, metadata: buildMetadata() };
      const afterNormalize: IAuditRecordContext = {
        ...afterLoad,
        normalizedBefore: {},
        normalizedAfter: {},
      };
      const afterDiff: IAuditRecordContext = {
        ...afterNormalize,
        diffs: [{ field: 'name', old: 'Alice', new: 'Bob' }],
      };

      loadMetadataStage.execute.mockReturnValue(afterLoad);
      normalizeStage.execute.mockReturnValue(afterNormalize);
      diffStage.execute.mockReturnValue(afterDiff);

      const result = await service.recordChange(input);

      expect(loadMetadataStage.execute).toHaveBeenCalledWith({ input });
      expect(normalizeStage.execute).toHaveBeenCalledWith(afterLoad);
      expect(diffStage.execute).toHaveBeenCalledWith(afterNormalize);
      expect(result).toEqual(afterDiff.diffs);
    });

    it('returns an empty array when the diff stage produced no diffs', async () => {
      const { service, loadMetadataStage, normalizeStage, diffStage } = buildService();

      const input = {
        entityName: 'user',
        entityUuid: 'uuid-1',
        actorUuid: null,
        action: 'update',
        before: null,
        after: null,
      };

      loadMetadataStage.execute.mockReturnValue({ input });
      normalizeStage.execute.mockReturnValue({ input });
      diffStage.execute.mockReturnValue({ input });

      const result = await service.recordChange(input);

      expect(result).toEqual([]);
    });
  });

  describe('buildChangeSet', () => {
    it('returns fallback DTOs, without running any read-side stage, when no metadata is registered', async () => {
      jest.spyOn(AuditMetadataRegistry, 'getByName').mockReturnValue(undefined);
      const { service, resolveRelationsStage, translateStage, formatStage, buildDtoStage } =
        buildService();

      const changes = [{ field: 'name', old: 'Alice', new: 'Bob' }];

      const result = await service.buildChangeSet('unknown-entity', changes, 'en-US');

      expect(result).toEqual([
        {
          field: 'name',
          label: 'name',
          old: { value: 'Alice', display: stringifyUnknown('Alice') },
          new: { value: 'Bob', display: stringifyUnknown('Bob') },
        },
      ]);
      expect(resolveRelationsStage.execute).not.toHaveBeenCalled();
      expect(translateStage.execute).not.toHaveBeenCalled();
      expect(formatStage.execute).not.toHaveBeenCalled();
      expect(buildDtoStage.execute).not.toHaveBeenCalled();
    });

    it('runs ResolveRelations -> Translate -> Format -> BuildDto in order when metadata is registered', async () => {
      const metadata = buildMetadata();
      jest.spyOn(AuditMetadataRegistry, 'getByName').mockReturnValue(metadata);
      const { service, resolveRelationsStage, translateStage, formatStage, buildDtoStage } =
        buildService();

      const changes = [{ field: 'name', old: 'Alice', new: 'Bob' }];
      const initialContext: IAuditChangeSetContext = {
        entityName: 'user',
        metadata,
        locale: 'en-US',
        changes,
      };
      const afterResolve: IAuditChangeSetContext = { ...initialContext, items: [] };
      const afterTranslate: IAuditChangeSetContext = { ...afterResolve, items: [] };
      const afterFormat: IAuditChangeSetContext = { ...afterTranslate, items: [] };
      const dtos = [
        {
          field: 'name',
          label: 'Name',
          old: { value: 'Alice', display: 'Alice' },
          new: { value: 'Bob', display: 'Bob' },
        },
      ];

      resolveRelationsStage.execute.mockResolvedValue(afterResolve);
      translateStage.execute.mockReturnValue(afterTranslate);
      formatStage.execute.mockResolvedValue(afterFormat);
      buildDtoStage.execute.mockReturnValue(dtos);

      const result = await service.buildChangeSet('user', changes, 'en-US');

      expect(resolveRelationsStage.execute).toHaveBeenCalledWith(initialContext);
      expect(translateStage.execute).toHaveBeenCalledWith(afterResolve);
      expect(formatStage.execute).toHaveBeenCalledWith(afterTranslate);
      expect(buildDtoStage.execute).toHaveBeenCalledWith(afterFormat);
      expect(result).toBe(dtos);
    });
  });

  describe('resolveEntityLabel', () => {
    it('translates using the registered metadata module and label as fallback', () => {
      const metadata = buildMetadata();
      jest.spyOn(AuditMetadataRegistry, 'getByName').mockReturnValue(metadata);
      const { service, translator } = buildService();
      translator.translateEntity.mockReturnValue('Usuário');

      const result = service.resolveEntityLabel('user', 'pt-BR');

      expect(result).toBe('Usuário');
      expect(translator.translateEntity).toHaveBeenCalledWith('users', 'user', 'pt-BR', 'User');
    });

    it('falls back to the raw entity name for both module and label when metadata is missing', () => {
      jest.spyOn(AuditMetadataRegistry, 'getByName').mockReturnValue(undefined);
      const { service, translator } = buildService();
      translator.translateEntity.mockReturnValue('unknown-entity');

      const result = service.resolveEntityLabel('unknown-entity', 'pt-BR');

      expect(result).toBe('unknown-entity');
      expect(translator.translateEntity).toHaveBeenCalledWith(
        'unknown-entity',
        'unknown-entity',
        'pt-BR',
        'unknown-entity',
      );
    });
  });
});
