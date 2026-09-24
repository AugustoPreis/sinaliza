import { IAuditChangeSetContext, IAuditEntityMetadata } from '../../../interfaces';
import { BuildDtoStage } from '../build-dto.stage';

function buildMetadata(): IAuditEntityMetadata {
  return {
    target: class User {},
    name: 'user',
    module: 'users',
    fields: new Map(),
  };
}

describe('BuildDtoStage', () => {
  const stage = new BuildDtoStage();

  it('returns an empty array when there are no items', () => {
    const context: IAuditChangeSetContext = {
      entityName: 'user',
      metadata: buildMetadata(),
      locale: 'en-US',
      changes: [],
    };

    expect(stage.execute(context)).toEqual([]);
  });

  it('maps a work item into an AuditFieldChangeDTO with its resolved label and display values', () => {
    const context: IAuditChangeSetContext = {
      entityName: 'user',
      metadata: buildMetadata(),
      locale: 'en-US',
      changes: [],
      items: [
        {
          field: 'name',
          meta: { propertyName: 'name' },
          rawOld: 'Alice',
          rawNew: 'Bob',
          label: 'Full name',
          formattedOld: 'Alice',
          formattedNew: 'Bob',
        },
      ],
    };

    const result = stage.execute(context);

    expect(result).toHaveLength(1);
    expect(result[0].field).toBe('name');
    expect(result[0].label).toBe('Full name');
    expect(result[0].old).toEqual({ value: 'Alice', display: 'Alice' });
    expect(result[0].new).toEqual({ value: 'Bob', display: 'Bob' });
  });

  it('falls back to the raw field name when the item has no resolved label', () => {
    const context: IAuditChangeSetContext = {
      entityName: 'user',
      metadata: buildMetadata(),
      locale: 'en-US',
      changes: [],
      items: [{ field: 'name', meta: { propertyName: 'name' }, rawOld: 'Alice', rawNew: 'Bob' }],
    };

    const result = stage.execute(context);

    expect(result[0].label).toBe('name');
  });

  it('falls back to an empty display string when a value was not formatted', () => {
    const context: IAuditChangeSetContext = {
      entityName: 'user',
      metadata: buildMetadata(),
      locale: 'en-US',
      changes: [],
      items: [{ field: 'name', meta: { propertyName: 'name' }, rawOld: null, rawNew: 'Bob' }],
    };

    const result = stage.execute(context);

    expect(result[0].old).toEqual({ value: null, display: '' });
  });

  it('preserves item order across multiple items', () => {
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

    const result = stage.execute(context);

    expect(result.map((dto) => dto.field)).toEqual(['name', 'age']);
  });
});
