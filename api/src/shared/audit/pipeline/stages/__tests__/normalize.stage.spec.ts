import { ModuleRef } from '@nestjs/core';
import { mockDeep } from 'jest-mock-extended';

import { AppException } from '@shared/exceptions';

import { IAuditEntityMetadata, IAuditNormalizer, IAuditRecordContext } from '../../../interfaces';
import { DefaultNormalizer } from '../../../normalizers/default.normalizer';
import { NormalizeStage } from '../normalize.stage';

function buildContext(metadata?: IAuditEntityMetadata): IAuditRecordContext {
  return {
    input: {
      entityName: 'user',
      entityUuid: 'uuid-1',
      actorUuid: null,
      action: 'update',
      before: { name: 'Alice', ignored: 'x', active: 1 },
      after: { name: 'Bob', ignored: 'y', active: 0 },
    },
    metadata,
  };
}

describe('NormalizeStage', () => {
  it('throws an AppException when metadata was not loaded by a previous stage', () => {
    const moduleRef = mockDeep<ModuleRef>();
    const defaultNormalizer = new DefaultNormalizer();
    const stage = new NormalizeStage(moduleRef, defaultNormalizer);

    expect(() => stage.execute(buildContext(undefined))).toThrow(AppException);
  });

  it('normalizes tracked fields using the DefaultNormalizer when no custom normalizer is set', () => {
    const moduleRef = mockDeep<ModuleRef>();
    const defaultNormalizer = new DefaultNormalizer();
    const stage = new NormalizeStage(moduleRef, defaultNormalizer);

    const metadata: IAuditEntityMetadata = {
      target: class User {},
      name: 'user',
      module: 'users',
      fields: new Map([['name', { propertyName: 'name' }]]),
    };

    const result = stage.execute(buildContext(metadata));

    expect(result.normalizedBefore).toEqual({ name: 'Alice' });
    expect(result.normalizedAfter).toEqual({ name: 'Bob' });
  });

  it('skips fields marked as ignore entirely', () => {
    const moduleRef = mockDeep<ModuleRef>();
    const defaultNormalizer = new DefaultNormalizer();
    const stage = new NormalizeStage(moduleRef, defaultNormalizer);

    const metadata: IAuditEntityMetadata = {
      target: class User {},
      name: 'user',
      module: 'users',
      fields: new Map([
        ['name', { propertyName: 'name' }],
        ['ignored', { propertyName: 'ignored', ignore: true }],
      ]),
    };

    const result = stage.execute(buildContext(metadata));

    expect(result.normalizedBefore).toEqual({ name: 'Alice' });
    expect(result.normalizedAfter).toEqual({ name: 'Bob' });
    expect(result.normalizedBefore).not.toHaveProperty('ignored');
  });

  it('uses the field custom normalizer resolved via ModuleRef when available', () => {
    const moduleRef = mockDeep<ModuleRef>();
    const defaultNormalizer = new DefaultNormalizer();
    const customNormalizer: IAuditNormalizer = { normalize: jest.fn(() => 'CUSTOM') };
    class CustomNormalizer implements IAuditNormalizer {
      normalize(): unknown {
        return 'CUSTOM';
      }
    }
    moduleRef.get.mockReturnValue(customNormalizer);

    const stage = new NormalizeStage(moduleRef, defaultNormalizer);

    const metadata: IAuditEntityMetadata = {
      target: class User {},
      name: 'user',
      module: 'users',
      fields: new Map([['active', { propertyName: 'active', normalizer: CustomNormalizer }]]),
    };

    const result = stage.execute(buildContext(metadata));

    expect(result.normalizedBefore).toEqual({ active: 'CUSTOM' });
    expect(result.normalizedAfter).toEqual({ active: 'CUSTOM' });
    expect(moduleRef.get).toHaveBeenCalledWith(CustomNormalizer, { strict: false });
  });

  it('falls back to the DefaultNormalizer when the custom normalizer is not resolvable', () => {
    const moduleRef = mockDeep<ModuleRef>();
    moduleRef.get.mockReturnValue(undefined);
    const defaultNormalizer = new DefaultNormalizer();
    class CustomNormalizer implements IAuditNormalizer {
      normalize(value: unknown): unknown {
        return value;
      }
    }

    const stage = new NormalizeStage(moduleRef, defaultNormalizer);

    const metadata: IAuditEntityMetadata = {
      target: class User {},
      name: 'user',
      module: 'users',
      fields: new Map([['name', { propertyName: 'name', normalizer: CustomNormalizer }]]),
    };

    const result = stage.execute(buildContext(metadata));

    expect(result.normalizedBefore).toEqual({ name: 'Alice' });
    expect(result.normalizedAfter).toEqual({ name: 'Bob' });
  });

  it('normalizes a missing field on the before/after record as undefined input', () => {
    const moduleRef = mockDeep<ModuleRef>();
    const normalizeSpy = jest.fn((value: unknown) => value ?? 'DEFAULT');
    const defaultNormalizer: IAuditNormalizer = { normalize: normalizeSpy };
    const stage = new NormalizeStage(moduleRef, defaultNormalizer);

    const metadata: IAuditEntityMetadata = {
      target: class User {},
      name: 'user',
      module: 'users',
      fields: new Map([['missing', { propertyName: 'missing' }]]),
    };

    const context: IAuditRecordContext = {
      input: {
        entityName: 'user',
        entityUuid: 'uuid-1',
        actorUuid: null,
        action: 'update',
        before: null,
        after: null,
      },
      metadata,
    };

    const result = stage.execute(context);

    expect(result.normalizedBefore).toEqual({ missing: 'DEFAULT' });
    expect(result.normalizedAfter).toEqual({ missing: 'DEFAULT' });
    expect(normalizeSpy).toHaveBeenCalledWith(undefined);
  });
});
