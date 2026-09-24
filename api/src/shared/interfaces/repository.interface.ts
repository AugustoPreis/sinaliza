import { IPaginatedResult } from './paginated-result.interface';

export interface IRepository<T, ID = number> {
  findById(id: ID): Promise<T | null>;
  findByUuid(uuid: string): Promise<T | null>;
  findAll(page: number, perPage: number): Promise<IPaginatedResult<T>>;
  create(data: Partial<T>): Promise<T>;
  update(id: ID, data: Partial<T>): Promise<T>;
  softDelete(id: ID): Promise<void>;
}
