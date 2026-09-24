import { buildPaginatedResult, buildSkip } from '../pagination.util';

describe('buildSkip', () => {
  it('returns 0 for the first page', () => {
    expect(buildSkip(1, 20)).toBe(0);
  });

  it('multiplies (page - 1) by perPage for subsequent pages', () => {
    expect(buildSkip(3, 20)).toBe(40);
  });
});

describe('buildPaginatedResult', () => {
  it('wraps the data with pagination meta, rounding lastPage up', () => {
    const result = buildPaginatedResult(['a', 'b'], 45, 2, 20);

    expect(result).toEqual({
      data: ['a', 'b'],
      meta: { total: 45, page: 2, perPage: 20, lastPage: 3 },
    });
  });

  it('computes lastPage as 0 when there is no data at all', () => {
    const result = buildPaginatedResult([], 0, 1, 20);

    expect(result.meta.lastPage).toBe(0);
  });

  it('computes an exact lastPage when total is a multiple of perPage', () => {
    const result = buildPaginatedResult([], 40, 1, 20);

    expect(result.meta.lastPage).toBe(2);
  });
});
