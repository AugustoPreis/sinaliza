import { mockDeep } from 'jest-mock-extended';
import { I18nService } from 'nestjs-i18n';

import { IAuditFormatContext } from '../../interfaces';
import { I18nAuditTranslator } from '../../translators/i18n-audit.translator';
import { BooleanFormatter } from '../boolean.formatter';
import { CurrencyFormatter } from '../currency.formatter';
import { DateFormatter } from '../date.formatter';
import { DefaultFormatter } from '../default.formatter';
import { EnumFormatter } from '../enum.formatter';
import { RelationFormatter } from '../relation.formatter';

const context: IAuditFormatContext = {
  module: 'users',
  entityName: 'user',
  field: 'status',
  locale: 'en-US',
};

describe('BooleanFormatter', () => {
  it('returns an empty string for null', () => {
    const i18n = mockDeep<I18nService>();
    const formatter = new BooleanFormatter(i18n);

    expect(formatter.format(null, context)).toBe('');
  });

  it('returns an empty string for undefined', () => {
    const i18n = mockDeep<I18nService>();
    const formatter = new BooleanFormatter(i18n);

    expect(formatter.format(undefined, context)).toBe('');
  });

  it('translates a truthy value using the common.yes key', () => {
    const i18n = mockDeep<I18nService>();
    i18n.translate.mockReturnValue('Yes');
    const formatter = new BooleanFormatter(i18n);

    const result = formatter.format(true, context);

    expect(result).toBe('Yes');
    expect(i18n.translate).toHaveBeenCalledWith('common.yes', {
      lang: context.locale,
      defaultValue: 'true',
    });
  });

  it('translates a falsy (non-nullish) value using the common.no key', () => {
    const i18n = mockDeep<I18nService>();
    i18n.translate.mockReturnValue('No');
    const formatter = new BooleanFormatter(i18n);

    const result = formatter.format(0, context);

    expect(result).toBe('No');
    expect(i18n.translate).toHaveBeenCalledWith('common.no', {
      lang: context.locale,
      defaultValue: 'false',
    });
  });
});

describe('CurrencyFormatter', () => {
  it('returns an empty string for null, undefined and empty string', () => {
    const formatter = new CurrencyFormatter();

    expect(formatter.format(null, context)).toBe('');
    expect(formatter.format(undefined, context)).toBe('');
    expect(formatter.format('', context)).toBe('');
  });

  it('formats a numeric value as BRL currency for the given locale', () => {
    const formatter = new CurrencyFormatter();

    const expected = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'BRL' }).format(
      1234.5,
    );

    expect(formatter.format(1234.5, context)).toBe(expected);
  });

  it('formats a numeric string value', () => {
    const formatter = new CurrencyFormatter();

    const expected = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'BRL' }).format(
      10,
    );

    expect(formatter.format('10', context)).toBe(expected);
  });

  it('falls back to a stringified value when it cannot be parsed as a number', () => {
    const formatter = new CurrencyFormatter();

    expect(formatter.format('not-a-number', context)).toBe('not-a-number');
  });

  it('reuses the same Intl.NumberFormat instance across calls for the same locale', () => {
    const formatter = new CurrencyFormatter();
    const spy = jest.spyOn(Intl, 'NumberFormat');

    formatter.format(1, context);
    formatter.format(2, context);

    expect(spy).toHaveBeenCalledTimes(1);

    spy.mockRestore();
  });
});

describe('DateFormatter', () => {
  it('returns an empty string for null, undefined and empty string', () => {
    const formatter = new DateFormatter();

    expect(formatter.format(null, context)).toBe('');
    expect(formatter.format(undefined, context)).toBe('');
    expect(formatter.format('', context)).toBe('');
  });

  it('formats a Date instance using the locale date/time style', () => {
    const formatter = new DateFormatter();
    const date = new Date('2024-01-15T10:00:00.000Z');

    const expected = new Intl.DateTimeFormat('en-US', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(date);

    expect(formatter.format(date, context)).toBe(expected);
  });

  it('formats a parseable date string', () => {
    const formatter = new DateFormatter();

    const expected = new Intl.DateTimeFormat('en-US', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date('2024-01-15T10:00:00.000Z'));

    expect(formatter.format('2024-01-15T10:00:00.000Z', context)).toBe(expected);
  });

  it('falls back to a stringified value for an unparseable date', () => {
    const formatter = new DateFormatter();

    expect(formatter.format('not-a-date', context)).toBe('not-a-date');
  });
});

describe('DefaultFormatter', () => {
  const formatter = new DefaultFormatter();

  it('stringifies null and undefined to an empty string', () => {
    expect(formatter.format(null)).toBe('');
    expect(formatter.format(undefined)).toBe('');
  });

  it('stringifies primitives directly', () => {
    expect(formatter.format('hello')).toBe('hello');
    expect(formatter.format(42)).toBe('42');
    expect(formatter.format(true)).toBe('true');
  });

  it('JSON-serializes objects and arrays', () => {
    expect(formatter.format({ a: 1 })).toBe(JSON.stringify({ a: 1 }));
    expect(formatter.format([1, 2])).toBe(JSON.stringify([1, 2]));
  });
});

describe('EnumFormatter', () => {
  it('returns an empty string for null and undefined', () => {
    const translator = mockDeep<I18nAuditTranslator>();
    const formatter = new EnumFormatter(translator);

    expect(formatter.format(null, context)).toBe('');
    expect(formatter.format(undefined, context)).toBe('');
  });

  it('delegates to the translator with the stringified enum value', () => {
    const translator = mockDeep<I18nAuditTranslator>();
    translator.translateEnum.mockReturnValue('Active');
    const formatter = new EnumFormatter(translator);

    const result = formatter.format('ACTIVE', context);

    expect(result).toBe('Active');
    expect(translator.translateEnum).toHaveBeenCalledWith(
      context.module,
      context.entityName,
      context.field,
      'ACTIVE',
      context.locale,
    );
  });

  it('stringifies a non-string enum value before delegating', () => {
    const translator = mockDeep<I18nAuditTranslator>();
    translator.translateEnum.mockReturnValue('One');
    const formatter = new EnumFormatter(translator);

    formatter.format(1, context);

    expect(translator.translateEnum).toHaveBeenCalledWith(
      context.module,
      context.entityName,
      context.field,
      '1',
      context.locale,
    );
  });
});

describe('RelationFormatter', () => {
  const formatter = new RelationFormatter();

  it('returns an empty string for null and undefined', () => {
    expect(formatter.format(null)).toBe('');
    expect(formatter.format(undefined)).toBe('');
  });

  it('formats a primitive value via stringifyUnknown', () => {
    expect(formatter.format('raw-id')).toBe('raw-id');
    expect(formatter.format(42)).toBe('42');
  });

  it('prefers "display" when resolving an object (as an IAuditRelationResolver might return)', () => {
    expect(formatter.format({ display: 'Display name', name: 'Name' })).toBe('Display name');
  });

  it('falls back to "name" when there is no "display"', () => {
    expect(formatter.format({ name: 'Name', label: 'Label' })).toBe('Name');
  });

  it('falls back to "label" when there is no "display"/"name"', () => {
    expect(formatter.format({ label: 'Label', title: 'Title' })).toBe('Label');
  });

  it('falls back to "title" when there is no "display"/"name"/"label"', () => {
    expect(formatter.format({ title: 'Title', id: 1 })).toBe('Title');
  });

  it('falls back to "id" when there is no display-ish field', () => {
    expect(formatter.format({ id: 1, uuid: 'some-uuid' })).toBe('1');
  });

  it('falls back to "uuid" when there is no id either', () => {
    expect(formatter.format({ uuid: 'some-uuid' })).toBe('some-uuid');
  });

  it('JSON-serializes the whole object when no known display field is present', () => {
    const value = { foo: 'bar' };

    expect(formatter.format(value)).toBe(JSON.stringify(value));
  });
});
