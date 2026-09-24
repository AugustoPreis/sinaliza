import { mockDeep } from 'jest-mock-extended';

import { PermissionEntity } from '../../entities/permission.entity';
import { PermissionsRepository } from '../../repositories/permissions.repository';
import { PermissionsRelationResolver } from '../permissions.relation-resolver';

describe('PermissionsRelationResolver', () => {
  const permissionsRepository = mockDeep<PermissionsRepository>();
  const resolver = new PermissionsRelationResolver(permissionsRepository);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the raw value untouched when the id list is empty', async () => {
    const result = await resolver.resolve([]);

    expect(result).toEqual([]);
    expect(permissionsRepository.findByIds).not.toHaveBeenCalled();
  });

  it('resolves numeric ids into a joined "resource:action" label', async () => {
    const permissions = [
      { id: 1, resource: 'users', action: 'read' } as PermissionEntity,
      { id: 2, resource: 'users', action: 'write' } as PermissionEntity,
    ];

    permissionsRepository.findByIds.mockResolvedValue(permissions);

    const result = await resolver.resolve([1, 2]);

    expect(permissionsRepository.findByIds).toHaveBeenCalledWith([1, 2]);
    expect(result).toBe('users:read, users:write');
  });

  it('wraps a single non-array value into a one-element id list', async () => {
    const permission = { id: 3, resource: 'roles', action: 'delete' } as PermissionEntity;

    permissionsRepository.findByIds.mockResolvedValue([permission]);

    const result = await resolver.resolve(3);

    expect(permissionsRepository.findByIds).toHaveBeenCalledWith([3]);
    expect(result).toBe('roles:delete');
  });

  it('filters out non-finite values before querying the repository', async () => {
    permissionsRepository.findByIds.mockResolvedValue([
      { id: 1, resource: 'users', action: 'read' } as PermissionEntity,
    ]);

    await resolver.resolve(['1', 'not-a-number', undefined]);

    expect(permissionsRepository.findByIds).toHaveBeenCalledWith([1]);
  });

  it('returns the raw value untouched when no matching permissions are found', async () => {
    permissionsRepository.findByIds.mockResolvedValue([]);

    const value = [999];
    const result = await resolver.resolve(value);

    expect(result).toBe(value);
  });
});
