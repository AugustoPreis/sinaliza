import { ExecutionContext, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { mockDeep } from 'jest-mock-extended';

import { UserEntity } from '@modules/users/entities/user.entity';
import { UsersRepository } from '@modules/users/repositories/users.repository';
import { getEffectivePermissions } from '@modules/users/utils/effective-permissions.util';

import { AppException } from '../../exceptions';
import { PermissionsGuard } from '../permissions.guard';

jest.mock('@modules/users/utils/effective-permissions.util');

function createContext(request: Record<string, unknown>): ExecutionContext {
  const getRequest = jest.fn().mockReturnValue(request);
  const switchToHttp = jest.fn().mockReturnValue({ getRequest });
  return {
    switchToHttp,
    getHandler: jest.fn(),
    getClass: jest.fn(),
  } as unknown as ExecutionContext;
}

describe('PermissionsGuard', () => {
  let reflector: ReturnType<typeof mockDeep<Reflector>>;
  let usersRepository: ReturnType<typeof mockDeep<UsersRepository>>;
  let guard: PermissionsGuard;

  beforeEach(() => {
    reflector = mockDeep<Reflector>();
    usersRepository = mockDeep<UsersRepository>();
    guard = new PermissionsGuard(reflector, usersRepository);
    jest.mocked(getEffectivePermissions).mockReset();
  });

  it('allows the request when no @RequirePermission metadata is present', async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    const result = await guard.canActivate(createContext({}));

    expect(result).toBe(true);
    expect(usersRepository.findByUuid).not.toHaveBeenCalled();
  });

  it('denies the request when there is no authenticated user', async () => {
    reflector.getAllAndOverride.mockReturnValue({ resource: 'users', action: 'read' });

    const result = await guard.canActivate(createContext({ user: undefined }));

    expect(result).toBe(false);
  });

  it('throws a 403 AppException when the permission is not in the effective set', async () => {
    reflector.getAllAndOverride.mockReturnValue({ resource: 'users', action: 'write' });
    usersRepository.findByUuid.mockResolvedValue({ userRoles: [] } as unknown as UserEntity);
    jest.mocked(getEffectivePermissions).mockReturnValue(['users:read']);

    const context = createContext({ user: { uuid: 'actor-uuid' } });

    await expect(guard.canActivate(context)).rejects.toMatchObject({
      i18nKey: 'errors.forbidden',
      status: HttpStatus.FORBIDDEN,
    });
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(AppException);
  });

  it('allows the request when the permission is in the effective set', async () => {
    reflector.getAllAndOverride.mockReturnValue({ resource: 'users', action: 'read' });
    usersRepository.findByUuid.mockResolvedValue({ userRoles: [] } as unknown as UserEntity);
    jest.mocked(getEffectivePermissions).mockReturnValue(['users:read']);

    const result = await guard.canActivate(createContext({ user: { uuid: 'actor-uuid' } }));

    expect(result).toBe(true);
    expect(usersRepository.findByUuid).toHaveBeenCalledWith('actor-uuid');
  });
});
