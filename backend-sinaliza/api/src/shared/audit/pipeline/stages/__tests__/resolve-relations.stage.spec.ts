import { ModuleRef } from '@nestjs/core';
import { mockDeep } from 'jest-mock-extended';

import {
  IAuditChangeSetContext,
  IAuditEntityMetadata,
  IAuditRelationResolver,
} from '../../../interfaces';
import { ResolveRelationsStage } from '../resolve-relations.stage';

class DepartmentResolver implements IAuditRelationResolver {
  resolve(): Promise<unknown> {
    return Promise.resolve({ display: 'Engineering' });
  }
}

function buildMetadata(
  fields: [string, { propertyName: string; relationResolver?: typeof DepartmentResolver }][],
): IAuditEntityMetadata {
  return {
    target: class User {},
    name: 'user',
    module: 'users',
    fields: new Map(fields),
  };
}

function buildContext(metadata: IAuditEntityMetadata): IAuditChangeSetContext {
  return {
    entityName: 'user',
    metadata,
    locale: 'en-US',
    changes: [{ field: 'departmentId', old: 1, new: 2 }],
  };
}

describe('ResolveRelationsStage', () => {
  it('builds a work item per change, carrying over the raw old/new values', async () => {
    const moduleRef = mockDeep<ModuleRef>();
    const stage = new ResolveRelationsStage(moduleRef);
    const metadata = buildMetadata([['departmentId', { propertyName: 'departmentId' }]]);

    const result = await stage.execute(buildContext(metadata));

    expect(result.items).toEqual([
      {
        field: 'departmentId',
        meta: { propertyName: 'departmentId' },
        rawOld: 1,
        rawNew: 2,
      },
    ]);
  });

  it('falls back to a bare propertyName meta when the field is not registered', async () => {
    const moduleRef = mockDeep<ModuleRef>();
    const stage = new ResolveRelationsStage(moduleRef);
    const metadata = buildMetadata([]);

    const result = await stage.execute(buildContext(metadata));

    expect(result.items?.[0].meta).toEqual({ propertyName: 'departmentId' });
  });

  it('resolves relation fields via the registered resolver', async () => {
    const moduleRef = mockDeep<ModuleRef>();
    const resolver = new DepartmentResolver();
    moduleRef.get.mockReturnValue(resolver);
    const stage = new ResolveRelationsStage(moduleRef);
    const metadata = buildMetadata([
      ['departmentId', { propertyName: 'departmentId', relationResolver: DepartmentResolver }],
    ]);

    const result = await stage.execute(buildContext(metadata));

    expect(result.items?.[0].resolvedOld).toEqual({ display: 'Engineering' });
    expect(result.items?.[0].resolvedNew).toEqual({ display: 'Engineering' });
    expect(moduleRef.get).toHaveBeenCalledWith(DepartmentResolver, { strict: false });
  });

  it('does not resolve fields without a relationResolver', async () => {
    const moduleRef = mockDeep<ModuleRef>();
    const stage = new ResolveRelationsStage(moduleRef);
    const metadata = buildMetadata([['departmentId', { propertyName: 'departmentId' }]]);

    const result = await stage.execute(buildContext(metadata));

    expect(result.items?.[0].resolvedOld).toBeUndefined();
    expect(result.items?.[0].resolvedNew).toBeUndefined();
    expect(moduleRef.get).not.toHaveBeenCalled();
  });

  it('keeps null/undefined values as-is without invoking the resolver', async () => {
    const moduleRef = mockDeep<ModuleRef>();
    const stage = new ResolveRelationsStage(moduleRef);
    const metadata = buildMetadata([
      ['departmentId', { propertyName: 'departmentId', relationResolver: DepartmentResolver }],
    ]);
    const context: IAuditChangeSetContext = {
      entityName: 'user',
      metadata,
      locale: 'en-US',
      changes: [{ field: 'departmentId', old: null, new: undefined }],
    };

    const result = await stage.execute(context);

    expect(result.items?.[0].resolvedOld).toBeNull();
    expect(result.items?.[0].resolvedNew).toBeUndefined();
    expect(moduleRef.get).not.toHaveBeenCalled();
  });

  it('falls back to the raw value when the resolver is not registered', async () => {
    const moduleRef = mockDeep<ModuleRef>();
    moduleRef.get.mockReturnValue(undefined);
    const stage = new ResolveRelationsStage(moduleRef);
    const metadata = buildMetadata([
      ['departmentId', { propertyName: 'departmentId', relationResolver: DepartmentResolver }],
    ]);

    const result = await stage.execute(buildContext(metadata));

    expect(result.items?.[0].resolvedOld).toBe(1);
    expect(result.items?.[0].resolvedNew).toBe(2);
  });

  it('falls back to the raw value when the resolver throws, so a broken relation never breaks the trail', async () => {
    const moduleRef = mockDeep<ModuleRef>();
    class FailingResolver implements IAuditRelationResolver {
      resolve(): Promise<unknown> {
        return Promise.reject(new Error('lookup failed'));
      }
    }
    moduleRef.get.mockReturnValue(new FailingResolver());
    const stage = new ResolveRelationsStage(moduleRef);
    const metadata = buildMetadata([
      ['departmentId', { propertyName: 'departmentId', relationResolver: FailingResolver }],
    ]);

    const result = await stage.execute(buildContext(metadata));

    expect(result.items?.[0].resolvedOld).toBe(1);
    expect(result.items?.[0].resolvedNew).toBe(2);
  });

  it('resolves multiple changes independently', async () => {
    const moduleRef = mockDeep<ModuleRef>();
    const stage = new ResolveRelationsStage(moduleRef);
    const metadata = buildMetadata([
      ['name', { propertyName: 'name' }],
      ['age', { propertyName: 'age' }],
    ]);
    const context: IAuditChangeSetContext = {
      entityName: 'user',
      metadata,
      locale: 'en-US',
      changes: [
        { field: 'name', old: 'Alice', new: 'Bob' },
        { field: 'age', old: 30, new: 31 },
      ],
    };

    const result = await stage.execute(context);

    expect(result.items).toHaveLength(2);
    expect(result.items?.[0].field).toBe('name');
    expect(result.items?.[1].field).toBe('age');
  });
});
