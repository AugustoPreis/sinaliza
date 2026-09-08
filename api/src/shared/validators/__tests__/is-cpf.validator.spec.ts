import { IsCpfConstraint } from '../is-cpf.validator';

describe('IsCpfConstraint', () => {
  const constraint = new IsCpfConstraint();

  it('accepts a valid CPF', () => {
    expect(constraint.validate('11144477735')).toBe(true);
  });

  it('accepts a valid, formatted CPF', () => {
    expect(constraint.validate('111.444.777-35')).toBe(true);
  });

  it('rejects a CPF with a wrong check digit', () => {
    expect(constraint.validate('11144477736')).toBe(false);
  });

  it('rejects a CPF made of a single repeated digit', () => {
    expect(constraint.validate('11111111111')).toBe(false);
  });

  it('rejects a CPF with the wrong length', () => {
    expect(constraint.validate('123')).toBe(false);
  });

  it('rejects an empty value', () => {
    expect(constraint.validate('')).toBe(false);
  });
});
