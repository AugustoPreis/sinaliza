import { assignDefined } from '../object.util';

interface ITarget {
  name: string;
  age: number | null;
  active: boolean;
  score: number;
}

describe('assignDefined', () => {
  it('ignores undefined keys, leaving the target value untouched', () => {
    const target: ITarget = { name: 'Ada', age: 30, active: true, score: 1 };

    assignDefined(target, { name: undefined });

    expect(target.name).toBe('Ada');
  });

  it('does not ignore null', () => {
    const target: ITarget = { name: 'Ada', age: 30, active: true, score: 1 };

    assignDefined(target, { age: null });

    expect(target.age).toBeNull();
  });

  it('does not ignore false', () => {
    const target: ITarget = { name: 'Ada', age: 30, active: true, score: 1 };

    assignDefined(target, { active: false });

    expect(target.active).toBe(false);
  });

  it('does not ignore 0', () => {
    const target: ITarget = { name: 'Ada', age: 30, active: true, score: 1 };

    assignDefined(target, { score: 0 });

    expect(target.score).toBe(0);
  });

  it('returns the mutated target', () => {
    const target: ITarget = { name: 'Ada', age: 30, active: true, score: 1 };

    expect(assignDefined(target, { name: 'Grace' })).toBe(target);
  });
});
