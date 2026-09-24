/**
 * Assigns only the defined (`!== undefined`) keys of `data` onto `target`,
 * mirroring how TypeORM's `Repository.update()` builds its `SET` clause (it
 * silently skips `undefined` values rather than writing them). Used when
 * migrating a repository method from `repo.update()`/`repo.delete()` to an
 * instance-based `repo.save()`/`repo.remove()`, so a partial DTO with some
 * `undefined` fields keeps not touching those columns.
 */
export function assignDefined<T extends object>(target: T, data: Partial<T>): T {
  for (const key of Object.keys(data) as (keyof T)[]) {
    if (data[key] !== undefined) {
      target[key] = data[key];
    }
  }

  return target;
}
