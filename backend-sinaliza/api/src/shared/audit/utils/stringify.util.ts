/**
 * Safely converts an arbitrary (`unknown`) value into a display string,
 * without ever falling back to `Object.prototype.toString` (`"[object
 * Object]"`). Primitives are stringified directly; anything else is
 * JSON-serialized.
 */
export function stringifyUnknown(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  switch (typeof value) {
    case 'string':
    case 'number':
    case 'boolean':
    case 'bigint':
      return String(value);
    default:
      try {
        return JSON.stringify(value) ?? '';
      } catch {
        return '';
      }
  }
}
