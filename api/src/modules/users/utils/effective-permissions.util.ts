import { UserRoleEntity } from '../entities/user-role.entity';

/** Permissions derived from a user's roles, deduplicated as `resource:action` keys. */
export function getEffectivePermissions(userRoles: UserRoleEntity[]): string[] {
  const keys = new Set<string>();

  for (const userRole of userRoles) {
    for (const permission of userRole.role.permissions) {
      keys.add(`${permission.resource}:${permission.action}`);
    }
  }

  return [...keys];
}
