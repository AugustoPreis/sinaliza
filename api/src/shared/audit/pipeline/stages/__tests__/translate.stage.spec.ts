import { mockDeep } from 'jest-mock-extended';

import { IAuditChangeSetContext, IAuditEntityMetadata } from '../../../interfaces';
import { I18nAuditTranslator } from '../../../translators/i18n-audit.translator';
import { TranslateStage } from '../translate.stage';

function buildMetadata(): IAuditEntityMetadata {
  return {
    target: class User {},
    name: 'user',
    module: 'users',
    fields: new Map(),
  };
}

describe('TranslateStage', () => {
  it('resolves and assigns a label for every item, preferring the decorator label as fallback', () => {
    const translator = mockDeep<I18nAuditTranslator>();
    translator.translateField.mockReturnValue('Nome completo');
    const stage = new TranslateStage(translator);

    const metadata = buildMetadata();
    const context: IAuditChangeSetContext = {
      entityName: 'user',
      metadata,
      locale: 'pt-BR',
      changes: [],
      items: [
        {
          field: 'name',
          meta: { propertyName: 'name', label: 'Full name' },
          rawOld: 'Alice',
          rawNew: 'Bob',
        },
      ],
    };

    const result = stage.execute(context);

    expect(result.items?.[0].label).toBe('Nome completo');
    expect(translator.translateField).toHaveBeenCalledWith(
      metadata.module,
      context.entityName,
      'name',
      context.locale,
      'Full name',
    );
  });

  it('passes undefined as the fallback when the field has no decorator label', () => {
    const translator = mockDeep<I18nAuditTranslator>();
    translator.translateField.mockReturnValue('name');
    const stage = new TranslateStage(translator);

    const metadata = buildMetadata();
    const context: IAuditChangeSetContext = {
      entityName: 'user',
      metadata,
      locale: 'en-US',
      changes: [],
      items: [{ field: 'name', meta: { propertyName: 'name' }, rawOld: 'Alice', rawNew: 'Bob' }],
    };

    stage.execute(context);

    expect(translator.translateField).toHaveBeenCalledWith(
      metadata.module,
      'user',
      'name',
      'en-US',
      undefined,
    );
  });

  it('resolves a label for every item independently', () => {
    const translator = mockDeep<I18nAuditTranslator>();
    translator.translateField.mockImplementation((_module, _entity, field) => `label:${field}`);
    const stage = new TranslateStage(translator);

    const metadata = buildMetadata();
    const context: IAuditChangeSetContext = {
      entityName: 'user',
      metadata,
      locale: 'en-US',
      changes: [],
      items: [
        { field: 'name', meta: { propertyName: 'name' }, rawOld: 'Alice', rawNew: 'Bob' },
        { field: 'age', meta: { propertyName: 'age' }, rawOld: 30, rawNew: 31 },
      ],
    };

    const result = stage.execute(context);

    expect(result.items?.[0].label).toBe('label:name');
    expect(result.items?.[1].label).toBe('label:age');
  });

  it('returns an empty items array when there are none to translate', () => {
    const translator = mockDeep<I18nAuditTranslator>();
    const stage = new TranslateStage(translator);

    const context: IAuditChangeSetContext = {
      entityName: 'user',
      metadata: buildMetadata(),
      locale: 'en-US',
      changes: [],
    };

    const result = stage.execute(context);

    expect(result.items).toEqual([]);
  });

  it('preserves the other properties of each item', () => {
    const translator = mockDeep<I18nAuditTranslator>();
    translator.translateField.mockReturnValue('Name');
    const stage = new TranslateStage(translator);

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
          resolvedOld: 'Alice',
          resolvedNew: 'Bob',
        },
      ],
    };

    const result = stage.execute(context);

    expect(result.items?.[0]).toMatchObject({
      field: 'name',
      rawOld: 'Alice',
      rawNew: 'Bob',
      resolvedOld: 'Alice',
      resolvedNew: 'Bob',
      label: 'Name',
    });
  });
});
