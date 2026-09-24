/**
 * Data carried through a single request's lifetime via `AsyncLocalStorage`.
 * Extend this as more request-scoped data is needed outside of Nest's own
 * request scope (e.g. by a TypeORM subscriber, which is not request-scoped).
 */
export interface IRequestContextStore {
  actorUuid: string | null;
}
