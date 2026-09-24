import { stringifyUnknown } from '../stringify.util';

describe('stringifyUnknown', () => {
  it('returns an empty string for null', () => {
    expect(stringifyUnknown(null)).toBe('');
  });

  it('returns an empty string for undefined', () => {
    expect(stringifyUnknown(undefined)).toBe('');
  });

  it('stringifies a string value directly', () => {
    expect(stringifyUnknown('hello')).toBe('hello');
  });

  it('stringifies a number value directly', () => {
    expect(stringifyUnknown(42)).toBe('42');
  });

  it('stringifies a boolean value directly', () => {
    expect(stringifyUnknown(true)).toBe('true');
    expect(stringifyUnknown(false)).toBe('false');
  });

  it('stringifies a bigint value directly', () => {
    expect(stringifyUnknown(BigInt(42))).toBe('42');
  });

  it('JSON-serializes a Date instance', () => {
    const date = new Date('2024-01-15T10:00:00.000Z');

    expect(stringifyUnknown(date)).toBe(JSON.stringify(date));
  });

  it('JSON-serializes a plain object', () => {
    expect(stringifyUnknown({ a: 1, b: 'two' })).toBe(JSON.stringify({ a: 1, b: 'two' }));
  });

  it('JSON-serializes an array', () => {
    expect(stringifyUnknown([1, 'two', false])).toBe(JSON.stringify([1, 'two', false]));
  });

  it('returns an empty string when JSON serialization throws (circular structure)', () => {
    const circular: Record<string, unknown> = { a: 1 };

    circular.self = circular;

    expect(stringifyUnknown(circular)).toBe('');
  });

  it('returns an empty string when JSON.stringify yields undefined (e.g. a bare function)', () => {
    expect(stringifyUnknown(() => 'noop')).toBe('');
  });
});
