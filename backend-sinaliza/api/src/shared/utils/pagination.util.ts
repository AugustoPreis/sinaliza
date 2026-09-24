import { IPaginatedResult } from '../interfaces';

export function buildPaginatedResult<T>(
  data: T[],
  total: number,
  page: number,
  perPage: number,
): IPaginatedResult<T> {
  return {
    data,
    meta: {
      total,
      page,
      perPage,
      lastPage: Math.ceil(total / perPage),
    },
  };
}

export function buildSkip(page: number, perPage: number): number {
  return (page - 1) * perPage;
}
