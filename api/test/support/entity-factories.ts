import { faker } from '@faker-js/faker';
import * as bcrypt from 'bcrypt';
import { v7 as uuidv7 } from 'uuid';

import { AuditLogEntity } from '@modules/audit/entities/audit-log.entity';
import { EAuditAction } from '@modules/audit/enums/audit-action.enum';
import { PermissionEntity } from '@modules/roles/entities/permission.entity';
import { RoleEntity } from '@modules/roles/entities/role.entity';
import { UserEntity } from '@modules/users/entities/user.entity';
import { EUserStatus } from '@modules/users/enums/user-status.enum';

export const DEFAULT_PASSWORD = 'Password@123';

// Low round count: only test fixtures hash this way, never production data.
const TEST_BCRYPT_ROUNDS = 4;

export function buildUser(overrides: Partial<UserEntity> & { password?: string } = {}): UserEntity {
  const { password, ...rest } = overrides;

  return {
    id: 0,
    uuid: uuidv7(),
    email: faker.internet.email().toLowerCase(),
    passwordHash: bcrypt.hashSync(password ?? DEFAULT_PASSWORD, TEST_BCRYPT_ROUNDS),
    name: faker.person.fullName(),
    institutionalId: null,
    institutionalLink: null,
    status: EUserStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    userRoles: [],
    sectorUsers: [],
    ...rest,
  };
}

export function buildPermission(overrides: Partial<PermissionEntity> = {}): PermissionEntity {
  return {
    id: 0,
    uuid: uuidv7(),
    resource: faker.helpers.arrayElement(['users', 'roles', 'permissions', 'audit']),
    action: faker.helpers.arrayElement(['create', 'read', 'update', 'delete']),
    description: faker.lorem.sentence(),
    roles: [],
    ...overrides,
  };
}

export function buildRole(overrides: Partial<RoleEntity> = {}): RoleEntity {
  return {
    id: 0,
    uuid: uuidv7(),
    name: faker.commerce.department() + '-' + faker.string.alphanumeric(6),
    description: faker.lorem.sentence(),
    isReserved: false,
    permissions: [],
    ...overrides,
  };
}

export function buildAuditLog(overrides: Partial<AuditLogEntity> = {}): AuditLogEntity {
  return {
    id: 0,
    uuid: uuidv7(),
    entityName: 'user',
    entityUuid: uuidv7(),
    action: EAuditAction.UPDATED,
    actorUuid: uuidv7(),
    changes: [],
    createdAt: new Date(),
    ...overrides,
  };
}
