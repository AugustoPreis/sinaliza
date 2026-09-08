import { Injectable } from '@nestjs/common';

import { IAuditRelationResolver } from '@shared/audit/interfaces';

import { PermissionsRepository } from '../repositories/permissions.repository';

/**
 * Resolves `Role.permissions`'s normalized value (a list of numeric
 * permission `id`s, produced by `ArrayNormalizer`) into a human-readable
 * display for the audit trail.
 */
@Injectable()
export class PermissionsRelationResolver implements IAuditRelationResolver<unknown> {
  constructor(private readonly permissionsRepository: PermissionsRepository) {}

  async resolve(value: unknown): Promise<unknown> {
    const ids = this.toIdList(value);

    if (ids.length === 0) {
      return value;
    }

    const permissions = await this.permissionsRepository.findByIds(ids);

    if (permissions.length === 0) {
      return value;
    }

    return permissions
      .map((permission) => `${permission.resource}:${permission.action}`)
      .join(', ');
  }

  private toIdList(value: unknown): number[] {
    const items = Array.isArray(value) ? value : [value];

    return items.map((item) => Number(item)).filter((id): id is number => Number.isFinite(id));
  }
}
