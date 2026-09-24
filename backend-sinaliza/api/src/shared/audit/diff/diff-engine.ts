import { IFieldDiff } from '../interfaces';

function isDeepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) {
    return true;
  }

  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) {
      return false;
    }

    return a.every((item, index) => isDeepEqual(item, b[index]));
  }

  const aIsObject = typeof a === 'object' && a !== null;
  const bIsObject = typeof b === 'object' && b !== null;

  if (aIsObject && bIsObject) {
    const aRecord = a as Record<string, unknown>;
    const bRecord = b as Record<string, unknown>;
    const aKeys = Object.keys(aRecord);
    const bKeys = Object.keys(bRecord);

    if (aKeys.length !== bKeys.length) {
      return false;
    }

    return aKeys.every((key) => isDeepEqual(aRecord[key], bRecord[key]));
  }

  return false;
}

/**
 * Pure diff calculator: compares two (already normalized) field maps and
 * reports which of the given fields changed. Knows nothing about TypeORM,
 * translation or HTTP.
 */
export class DiffEngine {
  static diff(
    before: Record<string, unknown> | null,
    after: Record<string, unknown> | null,
    fields: string[],
  ): IFieldDiff[] {
    const diffs: IFieldDiff[] = [];

    for (const field of fields) {
      const oldValue = before?.[field] ?? null;
      const newValue = after?.[field] ?? null;

      if (!isDeepEqual(oldValue, newValue)) {
        diffs.push({ field, old: oldValue, new: newValue });
      }
    }

    return diffs;
  }
}
