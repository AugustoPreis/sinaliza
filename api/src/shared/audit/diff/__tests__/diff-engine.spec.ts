import { DiffEngine } from '../diff-engine';

describe('DiffEngine', () => {
  describe('diff', () => {
    it('returns no diffs when every field is unchanged', () => {
      const before = { name: 'Alice', age: 30 };
      const after = { name: 'Alice', age: 30 };

      const diffs = DiffEngine.diff(before, after, ['name', 'age']);

      expect(diffs).toEqual([]);
    });

    it('reports a changed field with its old and new values', () => {
      const before = { name: 'Alice' };
      const after = { name: 'Bob' };

      const diffs = DiffEngine.diff(before, after, ['name']);

      expect(diffs).toEqual([{ field: 'name', old: 'Alice', new: 'Bob' }]);
    });

    it('only reports fields that actually changed, preserving field order', () => {
      const before = { a: 1, b: 2, c: 3 };
      const after = { a: 1, b: 20, c: 30 };

      const diffs = DiffEngine.diff(before, after, ['a', 'b', 'c']);

      expect(diffs).toEqual([
        { field: 'b', old: 2, new: 20 },
        { field: 'c', old: 3, new: 30 },
      ]);
    });

    it('treats a field missing from before as added, with old defaulting to null', () => {
      const before = {};
      const after = { name: 'Bob' };

      const diffs = DiffEngine.diff(before, after, ['name']);

      expect(diffs).toEqual([{ field: 'name', old: null, new: 'Bob' }]);
    });

    it('treats a field missing from after as removed, with new defaulting to null', () => {
      const before = { name: 'Alice' };
      const after = {};

      const diffs = DiffEngine.diff(before, after, ['name']);

      expect(diffs).toEqual([{ field: 'name', old: 'Alice', new: null }]);
    });

    it('treats a null before record as an empty record', () => {
      const after = { name: 'Bob' };

      const diffs = DiffEngine.diff(null, after, ['name']);

      expect(diffs).toEqual([{ field: 'name', old: null, new: 'Bob' }]);
    });

    it('treats a null after record as an empty record', () => {
      const before = { name: 'Alice' };

      const diffs = DiffEngine.diff(before, null, ['name']);

      expect(diffs).toEqual([{ field: 'name', old: 'Alice', new: null }]);
    });

    it('returns no diffs when both records are null', () => {
      const diffs = DiffEngine.diff(null, null, ['name']);

      expect(diffs).toEqual([]);
    });

    it('considers deeply equal objects with different key order unchanged', () => {
      const before = { meta: { a: 1, b: 2 } };
      const after = { meta: { b: 2, a: 1 } };

      const diffs = DiffEngine.diff(before, after, ['meta']);

      expect(diffs).toEqual([]);
    });

    it('considers objects with a different number of keys changed', () => {
      const before = { meta: { a: 1 } };
      const after = { meta: { a: 1, b: 2 } };

      const diffs = DiffEngine.diff(before, after, ['meta']);

      expect(diffs).toEqual([{ field: 'meta', old: { a: 1 }, new: { a: 1, b: 2 } }]);
    });

    it('considers arrays with the same items in the same order unchanged', () => {
      const before = { tags: [1, 2, 3] };
      const after = { tags: [1, 2, 3] };

      const diffs = DiffEngine.diff(before, after, ['tags']);

      expect(diffs).toEqual([]);
    });

    it('considers arrays with the same items in a different order changed', () => {
      const before = { tags: [1, 2, 3] };
      const after = { tags: [3, 2, 1] };

      const diffs = DiffEngine.diff(before, after, ['tags']);

      expect(diffs).toEqual([{ field: 'tags', old: [1, 2, 3], new: [3, 2, 1] }]);
    });

    it('considers an array and a non-array changed even with similar content', () => {
      const before = { tags: [1] };
      const after = { tags: 1 };

      const diffs = DiffEngine.diff(before, after, ['tags']);

      expect(diffs).toEqual([{ field: 'tags', old: [1], new: 1 }]);
    });

    it('returns no diffs when the field list is empty', () => {
      const diffs = DiffEngine.diff({ name: 'Alice' }, { name: 'Bob' }, []);

      expect(diffs).toEqual([]);
    });
  });
});
