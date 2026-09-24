import { AppException } from '@shared/exceptions';

import { IAuditEntityMetadata, IAuditRecordContext } from '../../../interfaces';
import { DiffStage } from '../diff.stage';

function buildMetadata(): IAuditEntityMetadata {
  return {
    target: class User {},
    name: 'user',
    module: 'users',
    fields: new Map([
      ['name', { propertyName: 'name' }],
      ['age', { propertyName: 'age' }],
      ['secret', { propertyName: 'secret', ignore: true }],
    ]),
  };
}

function buildInput(): IAuditRecordContext['input'] {
  return {
    entityName: 'user',
    entityUuid: 'uuid-1',
    actorUuid: null,
    action: 'update',
    before: null,
    after: null,
  };
}

describe('DiffStage', () => {
  const stage = new DiffStage();

  it('throws an AppException when metadata is missing', () => {
    const context: IAuditRecordContext = {
      input: buildInput(),
      normalizedBefore: {},
      normalizedAfter: {},
    };

    expect(() => stage.execute(context)).toThrow(AppException);
  });

  it('throws an AppException when normalizedBefore is missing', () => {
    const context: IAuditRecordContext = {
      input: buildInput(),
      metadata: buildMetadata(),
      normalizedAfter: {},
    };

    expect(() => stage.execute(context)).toThrow(AppException);
  });

  it('throws an AppException when normalizedAfter is missing', () => {
    const context: IAuditRecordContext = {
      input: buildInput(),
      metadata: buildMetadata(),
      normalizedBefore: {},
    };

    expect(() => stage.execute(context)).toThrow(AppException);
  });

  it('diffs only the non-ignored tracked fields', () => {
    const context: IAuditRecordContext = {
      input: buildInput(),
      metadata: buildMetadata(),
      normalizedBefore: { name: 'Alice', age: 30, secret: 'old-secret' },
      normalizedAfter: { name: 'Bob', age: 30, secret: 'new-secret' },
    };

    const result = stage.execute(context);

    expect(result.diffs).toEqual([{ field: 'name', old: 'Alice', new: 'Bob' }]);
  });

  it('returns no diffs when every tracked field is unchanged', () => {
    const context: IAuditRecordContext = {
      input: buildInput(),
      metadata: buildMetadata(),
      normalizedBefore: { name: 'Alice', age: 30, secret: 'x' },
      normalizedAfter: { name: 'Alice', age: 30, secret: 'y' },
    };

    const result = stage.execute(context);

    expect(result.diffs).toEqual([]);
  });

  it('preserves the rest of the context untouched', () => {
    const input = buildInput();
    const metadata = buildMetadata();
    const context: IAuditRecordContext = {
      input,
      metadata,
      normalizedBefore: { name: 'Alice', age: 30 },
      normalizedAfter: { name: 'Alice', age: 31 },
    };

    const result = stage.execute(context);

    expect(result.input).toBe(input);
    expect(result.metadata).toBe(metadata);
  });
});
