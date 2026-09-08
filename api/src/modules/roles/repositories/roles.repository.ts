import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, In, Repository } from 'typeorm';

import { IPaginatedResult } from '@shared/interfaces';
import { assignDefined } from '@shared/utils/object.util';
import { buildPaginatedResult, buildSkip } from '@shared/utils/pagination.util';

import { ListRoleDTO } from '../dtos/list-role.dto';
import { PermissionEntity } from '../entities/permission.entity';
import { RoleEntity } from '../entities/role.entity';

@Injectable()
export class RolesRepository {
  constructor(
    @InjectRepository(RoleEntity)
    private readonly repo: Repository<RoleEntity>,
    @InjectRepository(PermissionEntity)
    private readonly permRepo: Repository<PermissionEntity>,
  ) {}

  findById(id: number): Promise<RoleEntity | null> {
    return this.repo.findOne({ where: { id } });
  }

  findByUuid(uuid: string): Promise<RoleEntity | null> {
    return this.repo.findOne({ where: { uuid } });
  }

  findByName(name: string): Promise<RoleEntity | null> {
    return this.repo.findOne({ where: { name } });
  }

  async findAll(query: ListRoleDTO): Promise<IPaginatedResult<RoleEntity>> {
    const [data, total] = await this.repo.findAndCount({
      skip: buildSkip(query.page, query.perPage),
      take: query.perPage,
      where: { name: ILike(`%${query.search?.trim() ?? ''}%`) },
      order: { name: 'ASC' },
    });

    return buildPaginatedResult(data, total, query.page, query.perPage);
  }

  create(data: Partial<RoleEntity>): Promise<RoleEntity> {
    const entity = this.repo.create({ ...data, permissions: data.permissions ?? [] });

    return this.repo.save(entity);
  }

  async update(id: number, data: Partial<RoleEntity>): Promise<RoleEntity> {
    const entity = await this.repo.findOneOrFail({ where: { id } });

    assignDefined(entity, data);

    // `save()` (not `update()`) so the TypeORM subscriber driving the audit
    // trail gets a populated `event.databaseEntity`; `repo.update()` never
    // loads a "before" state.
    return this.repo.save(entity);
  }

  async delete(id: number): Promise<void> {
    const entity = await this.repo.findOneBy({ id });

    if (!entity) {
      return;
    }

    // `remove()` (not `delete()`) for the same subscriber reason as
    // `update()` above.
    await this.repo.remove(entity);
  }

  async setPermissions(roleId: number, permissionIds: number[]): Promise<void> {
    const role = await this.repo.findOneOrFail({ where: { id: roleId } });

    role.permissions = permissionIds.length
      ? await this.permRepo.findBy({ id: In(permissionIds) })
      : [];

    await this.repo.save(role);
  }
}
