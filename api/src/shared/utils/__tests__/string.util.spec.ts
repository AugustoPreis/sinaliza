import { maskDocument, normalizeWhitespace, toKebabCase, toPascalCase } from '../string.util';

describe('toKebabCase', () => {
  it('inserts a dash at camelCase boundaries and lowercases the result', () => {
    expect(toKebabCase('myVariableName')).toBe('my-variable-name');
  });

  it('replaces whitespace with a dash', () => {
    expect(toKebabCase('Hello World')).toBe('hello-world');
  });
});

describe('toPascalCase', () => {
  it('converts a kebab-case string to PascalCase', () => {
    expect(toPascalCase('my-variable-name')).toBe('MyVariableName');
  });

  it('converts a snake_case string to PascalCase', () => {
    expect(toPascalCase('my_variable_name')).toBe('MyVariableName');
  });

  it('converts a space-separated string to PascalCase', () => {
    expect(toPascalCase('hello world')).toBe('HelloWorld');
  });
});

describe('maskDocument', () => {
  it('masks every digit except the last 4', () => {
    expect(maskDocument('12345678901')).toBe('*******8901');
  });

  it('leaves a document with 4 or fewer digits untouched', () => {
    expect(maskDocument('1234')).toBe('1234');
  });
});

describe('normalizeWhitespace', () => {
  it('trims and collapses internal whitespace runs into a single space', () => {
    expect(normalizeWhitespace('  hello   world  ')).toBe('hello world');
  });

  it('leaves an already-normalized string untouched', () => {
    expect(normalizeWhitespace('hello world')).toBe('hello world');
  });
});
