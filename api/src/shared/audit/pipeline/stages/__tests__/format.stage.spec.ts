import { ModuleRef } from '@nestjs/core';
import { mockDeep } from 'jest-mock-extended';

import { DefaultFormatter } from '../../../formatters/default.formatter';
import { RelationFormatter } from '../../../formatters/relation.formatter';
import {
  IAuditChangeSetContext,
  IAuditEntityMetadata,
  IAuditFormatter,
  IAuditRelationResolver,
} from '../../../interfaces';
import { FormatStage } from '../format.stage';

class CustomFormatter implements IAuditFormatter {
  format(): string {
    return 'CUSTOM';
  }
}

class DepartmentResolver implements IAuditRelationResolver {
  resolve(): Promise<unknown> {
    return Promise.resolve(null);
  }
}

function buildMetadata(): IAuditEntityMetadata {
  return {
    target: class User {},
    name: 'user',
    module: 'users',
    fields: new Map(),
  };
}

function buildStage(): {
  stage: FormatStage;
  moduleRef: ReturnType<typeof mockDeep<ModuleRef>>;
  defaultFormatter: ReturnType<typeof mockDeep<DefaultFormatter>>;
  relationFormatter: ReturnType<typeof mockDeep<RelationFormatter>>;
} {
  const moduleRef = mockDeep<ModuleRef>();
  const defaultFormatter = mockDeep<DefaultFormatter>();
  const relationFormatter = mockDeep<RelationFormatter>();
  const stage = new FormatStage(moduleRef, defaultFormatter, relationFormatter);

  return { stage, moduleRef, defaultFormatter, relationFormatter };
}

describe('FormatStage', () => {
  it('formats raw old/new values with the DefaultFormatter when no formatter/relationResolver is set', async () => {
    const { stage, defaultFormatter } = buildStage();
    defaultFormatter.format.mockReturnValue('formatted');

    const context: IAuditChangeSetContext = {
      entityName: 'user',
      metadata: buildMetadata(),
      locale: 'en-US',
      changes: [],
      items: [{ field: 'name', meta: { propertyName: 'name' }, rawOld: 'Alice', rawNew: 'Bob' }],
    };

    const result = await stage.execute(context);

    expect(result.items?.[0].formattedOld).toBe('formatted');
    expect(result.items?.[0].formattedNew).toBe('formatted');
    expect(defaultFormatter.format).toHaveBeenCalledWith('Alice', {
      module: 'users',
      entityName: 'user',
      field: 'name',
      locale: 'en-US',
    });
    expect(defaultFormatter.format).toHaveBeenCalledWith('Bob', expect.anything());
  });

  it('uses the RelationFormatter and the resolved values when the field has a relationResolver', async () => {
    const { stage, relationFormatter } = buildStage();
    relationFormatter.format.mockReturnValue('Engineering');

    const context: IAuditChangeSetContext = {
      entityName: 'user',
      metadata: buildMetadata(),
      locale: 'en-US',
      changes: [],
      items: [
        {
          field: 'departmentId',
          meta: { propertyName: 'departmentId', relationResolver: DepartmentResolver },
          rawOld: 1,
          rawNew: 2,
          resolvedOld: { display: 'Old dept' },
          resolvedNew: { display: 'Engineering' },
        },
      ],
    };

    const result = await stage.execute(context);

    expect(relationFormatter.format).toHaveBeenCalledWith(
      { display: 'Old dept' },
      expect.anything(),
    );
    expect(relationFormatter.format).toHaveBeenCalledWith(
      { display: 'Engineering' },
      expect.anything(),
    );
    expect(result.items?.[0].formattedOld).toBe('Engineering');
    expect(result.items?.[0].formattedNew).toBe('Engineering');
  });

  it('prefers the field custom formatter, resolved via ModuleRef, over the RelationFormatter', async () => {
    const { stage, moduleRef, relationFormatter } = buildStage();
    const customFormatter = mockDeep<CustomFormatter>();
    customFormatter.format.mockReturnValue('CUSTOM');
    moduleRef.get.mockReturnValue(customFormatter);

    const context: IAuditChangeSetContext = {
      entityName: 'user',
      metadata: buildMetadata(),
      locale: 'en-US',
      changes: [],
      items: [
        {
          field: 'departmentId',
          meta: {
            propertyName: 'departmentId',
            formatter: CustomFormatter,
            relationResolver: DepartmentResolver,
          },
          rawOld: 1,
          rawNew: 2,
          resolvedOld: { display: 'Old dept' },
          resolvedNew: { display: 'Engineering' },
        },
      ],
    };

    const result = await stage.execute(context);

    expect(moduleRef.get).toHaveBeenCalledWith(CustomFormatter, { strict: false });
    expect(customFormatter.format).toHaveBeenCalled();
    expect(relationFormatter.format).not.toHaveBeenCalled();
    expect(result.items?.[0].formattedOld).toBe('CUSTOM');
  });

  it('falls back to the RelationFormatter when the custom formatter cannot be resolved', async () => {
    const { stage, moduleRef, relationFormatter } = buildStage();
    moduleRef.get.mockReturnValue(undefined);
    relationFormatter.format.mockReturnValue('Engineering');

    const context: IAuditChangeSetContext = {
      entityName: 'user',
      metadata: buildMetadata(),
      locale: 'en-US',
      changes: [],
      items: [
        {
          field: 'departmentId',
          meta: {
            propertyName: 'departmentId',
            formatter: CustomFormatter,
            relationResolver: DepartmentResolver,
          },
          rawOld: 1,
          rawNew: 2,
          resolvedOld: { display: 'Engineering' },
          resolvedNew: { display: 'Engineering' },
        },
      ],
    };

    const result = await stage.execute(context);

    expect(relationFormatter.format).toHaveBeenCalled();
    expect(result.items?.[0].formattedOld).toBe('Engineering');
  });

  it('short-circuits to an empty string without invoking the formatter for null/undefined values', async () => {
    const { stage, defaultFormatter } = buildStage();

    const context: IAuditChangeSetContext = {
      entityName: 'user',
      metadata: buildMetadata(),
      locale: 'en-US',
      changes: [],
      items: [{ field: 'name', meta: { propertyName: 'name' }, rawOld: null, rawNew: undefined }],
    };

    const result = await stage.execute(context);

    expect(result.items?.[0].formattedOld).toBe('');
    expect(result.items?.[0].formattedNew).toBe('');
    expect(defaultFormatter.format).not.toHaveBeenCalled();
  });

  it('formats every item in the context', async () => {
    const { stage, defaultFormatter } = buildStage();
    defaultFormatter.format.mockImplementation((value) => `formatted:${String(value)}`);

    const context: IAuditChangeSetContext = {
      entityName: 'user',
      metadata: buildMetadata(),
      locale: 'en-US',
      changes: [],
      items: [
        { field: 'name', meta: { propertyName: 'name' }, rawOld: 'Alice', rawNew: 'Bob' },
        { field: 'age', meta: { propertyName: 'age' }, rawOld: 30, rawNew: 31 },
      ],
    };

    const result = await stage.execute(context);

    expect(result.items?.[0].formattedOld).toBe('formatted:Alice');
    expect(result.items?.[1].formattedOld).toBe('formatted:30');
  });
});
