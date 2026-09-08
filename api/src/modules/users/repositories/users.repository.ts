import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, IsNull, Repository } from 'typeorm';

import { IPaginatedResult } from '@shared/interfaces';
import { assignDefined } from '@shared/utils/object.util';
import { buildPaginatedResult, buildSkip } from '@shared/utils/pagination.util';

import { SectorUserEntity } from '../entities/sector-user.entity';
import { UserRoleEntity } from '../entities/user-role.entity';
import { UserEntity } from '../entities/user.entity';
import { EUserStatus } from '../enums/user-status.enum';

const USER_RELATIONS = { userRoles: { role: true }, sectorUsers: { sector: true } } as const;

@Injectable()
export class UsersRepository {
  constructor(
    @InjectRepository(UserEntity)
    private readonly repo: Repository<UserEntity>,
    @InjectRepository(UserRoleEntity)
    private readonly userRoleRepo: Repository<UserRoleEntity>,
    @InjectRepository(SectorUserEntity)
    private readonly sectorUserRepo: Repository<SectorUserEntity>,
  ) {}

  findById(id: number): Promise<UserEntity | null> {
    return this.repo.findOne({ where: { id }, relations: USER_RELATIONS });
  }

  findByUuid(uuid: string): Promise<UserEntity | null> {
    return this.repo.findOne({
      where: { uuid, deletedAt: IsNull() },
      relations: USER_RELATIONS,
    });
  }

  findByEmail(email: string): Promise<UserEntity | null> {
    return this.repo.findOne({
      where: { email, deletedAt: IsNull() },
      relations: USER_RELATIONS,
    });
  }

  // Login by matrícula (`institutionalId`) or e-mail — see `LocalStrategy`.
  findByIdentifier(identifier: string): Promise<UserEntity | null> {
    return this.repo.findOne({
      where: [
        { email: identifier, deletedAt: IsNull() },
        { institutionalId: identifier, deletedAt: IsNull() },
      ],
      relations: USER_RELATIONS,
    });
  }

  findByUuidWithPassword(uuid: string): Promise<UserEntity | null> {
    return this.repo
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .leftJoinAndSelect('user.userRoles', 'userRole')
      .leftJoinAndSelect('userRole.role', 'role')
      .leftJoinAndSelect('role.permissions', 'permission')
      .leftJoinAndSelect('user.sectorUsers', 'sectorUser')
      .leftJoinAndSelect('sectorUser.sector', 'sector')
      .where('user.uuid = :uuid', { uuid })
      .andWhere('user.deletedAt IS NULL')
      .getOne();
  }

  findByEmailWithPassword(email: string): Promise<UserEntity | null> {
    return this.repo
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .leftJoinAndSelect('user.userRoles', 'userRole')
      .leftJoinAndSelect('userRole.role', 'role')
      .leftJoinAndSelect('role.permissions', 'permission')
      .leftJoinAndSelect('user.sectorUsers', 'sectorUser')
      .leftJoinAndSelect('sectorUser.sector', 'sector')
      .where('user.email = :email', { email })
      .andWhere('user.deletedAt IS NULL')
      .getOne();
  }

  // Login by matrícula or e-mail, with the password hash selected — used by
  // `LocalStrategy`.
  findByIdentifierWithPassword(identifier: string): Promise<UserEntity | null> {
    return this.repo
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .leftJoinAndSelect('user.userRoles', 'userRole')
      .leftJoinAndSelect('userRole.role', 'role')
      .leftJoinAndSelect('role.permissions', 'permission')
      .leftJoinAndSelect('user.sectorUsers', 'sectorUser')
      .leftJoinAndSelect('sectorUser.sector', 'sector')
      .where('(user.email = :identifier OR user.institutionalId = :identifier)', { identifier })
      .andWhere('user.deletedAt IS NULL')
      .getOne();
  }

  async search(
    page: number,
    perPage: number,
    filters: { search?: string; status?: EUserStatus; roleUuid?: string },
  ): Promise<IPaginatedResult<UserEntity>> {
    const baseWhere: Record<string, unknown> = { deletedAt: IsNull() };

    if (filters.status) {
      baseWhere.status = filters.status;
    }

    if (filters.roleUuid) {
      baseWhere.userRoles = { role: { uuid: filters.roleUuid } };
    }

    const where = filters.search
      ? [
          { ...baseWhere, name: ILike(`%${filters.search}%`) },
          { ...baseWhere, email: ILike(`%${filters.search}%`) },
        ]
      : baseWhere;

    const [data, total] = await this.repo.findAndCount({
      where,
      relations: USER_RELATIONS,
      skip: buildSkip(page, perPage),
      take: perPage,
      order: { email: 'ASC' },
    });

    return buildPaginatedResult(data, total, page, perPage);
  }

  async create(data: Partial<UserEntity>): Promise<UserEntity> {
    const entity = this.repo.create(data);

    const saved = await this.repo.save(entity);

    return this.findByUuid(saved.uuid) as Promise<UserEntity>;
  }

  async update(id: number, data: Partial<UserEntity>): Promise<UserEntity> {
    const entity = await this.repo.findOneOrFail({ where: { id }, relations: USER_RELATIONS });

    assignDefined(entity, data);

    // Loaded (rather than QueryBuilder-updated) and saved via `save()` so the
    // TypeORM subscriber driving the audit trail gets a populated
    // `event.databaseEntity`; `repo.update()` never loads a "before" state.
    return this.repo.save(entity);
  }

  async softDelete(id: number): Promise<void> {
    const entity = await this.repo.findOneBy({ id });

    if (!entity) {
      return;
    }

    // `softRemove()` (not `softDelete()`) for the same subscriber reason as
    // `update()` above.
    await this.repo.softRemove(entity);
  }

  async setRoles(userId: number, roleIds: number[]): Promise<void> {
    await this.userRoleRepo.delete({ userId });

    if (roleIds.length) {
      const entries = roleIds.map((roleId) => this.userRoleRepo.create({ userId, roleId }));
      await this.userRoleRepo.save(entries);
    }
  }

  async setSectors(userId: number, sectorIds: number[]): Promise<void> {
    await this.sectorUserRepo.delete({ userId });

    if (sectorIds.length) {
      const entries = sectorIds.map((sectorId) => this.sectorUserRepo.create({ userId, sectorId }));
      await this.sectorUserRepo.save(entries);
    }
  }
}
