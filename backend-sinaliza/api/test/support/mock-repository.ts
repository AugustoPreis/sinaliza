import { mockDeep, MockProxy } from 'jest-mock-extended';
import { Repository } from 'typeorm';

export function createMockRepository<T extends object>(): MockProxy<Repository<T>> {
  return mockDeep<Repository<T>>();
}
