export interface IPaginationMeta {
  total: number;
  page: number;
  perPage: number;
  lastPage: number;
}

export interface IPaginatedResult<T> {
  data: T[];
  meta: IPaginationMeta;
}
