/**
 * Shape of AppException's optional `code` field. Populated case-by-case
 * as call sites are audited, this only fixes the type both sides agree on,
 * not an exhaustive catalog of values.
 */
export type ErrorCode = string;
