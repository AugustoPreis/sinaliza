import { AppException } from '@shared/exceptions';

import { IAuditEntityMetadata, IAuditRecordContext } from '../../../interfaces';
import { AuditMetadataRegistry } from '../../../registry/audit-metadata.registry';
import { LoadMetadataStage } from '../load-metadata.stage';

describe('LoadMetadataStage', () => {
  const stage = new LoadMetadataStage();

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('merges the metadata found in the registry into the context', () => {
    const metadata: IAuditEntityMetadata = {
      target: class User {},
      name: 'user',
      module: 'users',
      fields: new Map(),
    };
    jest.spyOn(AuditMetadataRegistry, 'getByName').mockReturnValue(metadata);

    const input: IAuditRecordContext['input'] = {
      entityName: 'user',
      entityUuid: 'uuid-1',
      actorUuid: null,
      action: 'update',
      before: null,
      after: null,
    };
    const context: IAuditRecordContext = { input };

    const result = stage.execute(context);

    expect(result).toEqual({ input, metadata });
    expect(AuditMetadataRegistry.getByName).toHaveBeenCalledWith('user');
  });

  it('throws an AppException when no metadata is registered for the entity', () => {
    jest.spyOn(AuditMetadataRegistry, 'getByName').mockReturnValue(undefined);

    const context: IAuditRecordContext = {
      input: {
        entityName: 'unknown-entity',
        entityUuid: 'uuid-1',
        actorUuid: null,
        action: 'update',
        before: null,
        after: null,
      },
    };

    expect.assertions(5);
    expect(() => stage.execute(context)).toThrow(AppException);

    try {
      stage.execute(context);
    } catch (error) {
      expect(error).toBeInstanceOf(AppException);
      const appException = error as AppException;

      expect(appException.i18nKey).toBe('audit.errors.metadataNotFound');
      expect(appException.getStatus()).toBe(500);
      expect(appException.args).toEqual({ entityName: 'unknown-entity' });
    }
  });
});
