export interface IAuditNormalizer<T = unknown> {
  normalize(value: T): unknown;
}
