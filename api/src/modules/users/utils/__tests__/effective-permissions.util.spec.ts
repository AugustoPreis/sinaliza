import { RoleEntity } from '@modules/roles/entities/role.entity';

import { UserRoleEntity } from '../../entities/user-role.entity';
import { getEffectivePermissions } from '../effective-permissions.util';

describe('getEffectivePermissions', () => {
  const buildUserRole = (permissions: { resource: string; action: string }[]): UserRoleEntity =>
    ({
      role: { permissions } as RoleEntity,
    }) as UserRoleEntity;

  it('returns an empty list when there are no roles', () => {
    expect(getEffectivePermissions([])).toEqual([]);
  });

  it('returns an empty list when the role has no permissions', () => {
    const userRoles = [buildUserRole([])];

    expect(getEffectivePermissions(userRoles)).toEqual([]);
  });

  it('flattens permissions from a role into resource:action keys', () => {
    const userRoles = [
      buildUserRole([
        { resource: 'users', action: 'read' },
        { resource: 'users', action: 'write' },
      ]),
    ];

    expect(getEffectivePermissions(userRoles)).toEqual(['users:read', 'users:write']);
  });

  it('deduplicates permissions shared across multiple roles', () => {
    const userRoles = [
      buildUserRole([{ resource: 'users', action: 'read' }]),
      buildUserRole([
        { resource: 'users', action: 'read' },
        { resource: 'roles', action: 'read' },
      ]),
    ];

    expect(getEffectivePermissions(userRoles)).toEqual(['users:read', 'roles:read']);
  });
});
