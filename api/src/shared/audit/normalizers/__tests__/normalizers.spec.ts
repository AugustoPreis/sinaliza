import { ArrayNormalizer } from '../array.normalizer';
import { BooleanNormalizer } from '../boolean.normalizer';
import { DateNormalizer } from '../date.normalizer';
import { DefaultNormalizer } from '../default.normalizer';
import { EnumNormalizer } from '../enum.normalizer';

describe('ArrayNormalizer', () => {
  const normalizer = new ArrayNormalizer();

  it('normalizes undefined to null', () => {
    expect(normalizer.normalize(undefined)).toBeNull();
  });

  it('normalizes null to null', () => {
    expect(normalizer.normalize(null)).toBeNull();
  });

  it('returns non-array values unchanged', () => {
    expect(normalizer.normalize('not-an-array')).toBe('not-an-array');
  });

  it('sorts primitive items so order never affects the diff', () => {
    expect(normalizer.normalize(['b', 'c', 'a'])).toEqual(['a', 'b', 'c']);
  });

  it('reduces objects with an id to that id', () => {
    const result = normalizer.normalize([{ id: 2 }, { id: 1 }]);

    expect(result).toEqual([1, 2]);
  });

  it('prefers id over uuid when both are present', () => {
    const result = normalizer.normalize([{ id: 1, uuid: 'z-uuid' }]);

    expect(result).toEqual([1]);
  });

  it('reduces objects with a uuid (and no id) to that uuid', () => {
    const result = normalizer.normalize([{ uuid: 'b-uuid' }, { uuid: 'a-uuid' }]);

    expect(result).toEqual(['a-uuid', 'b-uuid']);
  });

  it('JSON-stringifies objects with neither id nor uuid', () => {
    const result = normalizer.normalize([{ foo: 'bar' }]);

    expect(result).toEqual([JSON.stringify({ foo: 'bar' })]);
  });

  it('produces the same normalized result regardless of input order', () => {
    const first = normalizer.normalize([{ id: 3 }, { id: 1 }, { id: 2 }]);
    const second = normalizer.normalize([{ id: 1 }, { id: 2 }, { id: 3 }]);

    expect(first).toEqual(second);
  });
});

describe('BooleanNormalizer', () => {
  const normalizer = new BooleanNormalizer();

  it('normalizes undefined to null', () => {
    expect(normalizer.normalize(undefined)).toBeNull();
  });

  it('normalizes null to null', () => {
    expect(normalizer.normalize(null)).toBeNull();
  });

  it('normalizes truthy values to true', () => {
    expect(normalizer.normalize(1)).toBe(true);
    expect(normalizer.normalize('yes')).toBe(true);
  });

  it('normalizes falsy values (other than null/undefined) to false', () => {
    expect(normalizer.normalize(0)).toBe(false);
    expect(normalizer.normalize('')).toBe(false);
  });
});

describe('DateNormalizer', () => {
  const normalizer = new DateNormalizer();

  it('normalizes undefined to null', () => {
    expect(normalizer.normalize(undefined)).toBeNull();
  });

  it('normalizes null to null', () => {
    expect(normalizer.normalize(null)).toBeNull();
  });

  it('normalizes an empty string to null', () => {
    expect(normalizer.normalize('')).toBeNull();
  });

  it('normalizes a Date instance to its ISO representation', () => {
    const date = new Date('2024-01-15T10:00:00.000Z');

    expect(normalizer.normalize(date)).toBe('2024-01-15T10:00:00.000Z');
  });

  it('normalizes a parseable date string to ISO-8601', () => {
    expect(normalizer.normalize('2024-01-15')).toBe(new Date('2024-01-15').toISOString());
  });

  it('normalizes a timestamp number to ISO-8601', () => {
    const timestamp = Date.parse('2024-01-15T10:00:00.000Z');

    expect(normalizer.normalize(timestamp)).toBe('2024-01-15T10:00:00.000Z');
  });

  it('normalizes an unparseable date string to null', () => {
    expect(normalizer.normalize('not-a-date')).toBeNull();
  });
});

describe('DefaultNormalizer', () => {
  const normalizer = new DefaultNormalizer();

  it('normalizes undefined to null', () => {
    expect(normalizer.normalize(undefined)).toBeNull();
  });

  it('passes null through unchanged', () => {
    expect(normalizer.normalize(null)).toBeNull();
  });

  it('passes primitives through unchanged', () => {
    expect(normalizer.normalize('value')).toBe('value');
    expect(normalizer.normalize(42)).toBe(42);
    expect(normalizer.normalize(false)).toBe(false);
  });

  it('passes objects through by reference, unmodified', () => {
    const value = { a: 1 };

    expect(normalizer.normalize(value)).toBe(value);
  });
});

describe('EnumNormalizer', () => {
  const normalizer = new EnumNormalizer();

  it('normalizes undefined to null', () => {
    expect(normalizer.normalize(undefined)).toBeNull();
  });

  it('normalizes null to null', () => {
    expect(normalizer.normalize(null)).toBeNull();
  });

  it('normalizes a string enum value to itself', () => {
    expect(normalizer.normalize('ACTIVE')).toBe('ACTIVE');
  });

  it('normalizes a numeric enum value to its string representation', () => {
    expect(normalizer.normalize(1)).toBe('1');
  });

  it('normalizes a non-primitive value via JSON serialization', () => {
    expect(normalizer.normalize({ a: 1 })).toBe(JSON.stringify({ a: 1 }));
  });
});
