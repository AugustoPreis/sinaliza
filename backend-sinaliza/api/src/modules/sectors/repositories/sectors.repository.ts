import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, In, Repository } from 'typeorm';

import { ROLE_SECTOR } from '@shared/constants';
import { assignDefined } from '@shared/utils/object.util';

import { SectorUserEntity } from '@modules/users/entities/sector-user.entity';
import { UserEntity } from '@modules/users/entities/user.entity';

import { SectorEntity } from '../entities/sector.entity';

@Injectable()
export class SectorsRepository {
  constructor(
    @InjectRepository(SectorEntity)
    private readonly repo: Repository<SectorEntity>,
    @InjectRepository(SectorUserEntity)
    private readonly sectorUserRepo: Repository<SectorUserEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
  ) {}

  findAll(): Promise<SectorEntity[]> {
    return this.repo.find({ order: { name: 'ASC' } });
  }

  findByUuid(uuid: string): Promise<SectorEntity | null> {
    return this.repo.findOne({ where: { uuid } });
  }

  search(search?: string): Promise<SectorEntity[]> {
    return this.repo.find({
      where: search ? { name: ILike(`%${search}%`) } : {},
      order: { name: 'ASC' },
    });
  }

  create(data: Partial<SectorEntity>): Promise<SectorEntity> {
    const entity = this.repo.create(data);

    return this.repo.save(entity);
  }

  async update(id: number, data: Partial<SectorEntity>): Promise<SectorEntity> {
    const entity = await this.repo.findOneOrFail({ where: { id } });

    assignDefined(entity, data);

    return this.repo.save(entity);
  }

  // Only users with the SECTOR role count as "responsible", even though
  // `sector_users` itself doesn't enforce that.
  async findResponsibleUsers(sectorId: number): Promise<UserEntity[]> {
    const map = await this.findResponsibleUsersBySectorIds([sectorId]);

    return map.get(sectorId) ?? [];
  }

  async findResponsibleUsersBySectorIds(sectorIds: number[]): Promise<Map<number, UserEntity[]>> {
    const map = new Map<number, UserEntity[]>();

    if (!sectorIds.length) return map;

    const rows = await this.sectorUserRepo
      .createQueryBuilder('sectorUser')
      .innerJoinAndSelect('sectorUser.user', 'user')
      .innerJoin('user.userRoles', 'userRole')
      .innerJoin('userRole.role', 'role')
      .where('sectorUser.sectorId IN (:...sectorIds)', { sectorIds })
      .andWhere('role.name = :roleName', { roleName: ROLE_SECTOR })
      .getMany();

    for (const row of rows) {
      const list = map.get(row.sectorId) ?? [];
      list.push(row.user);
      map.set(row.sectorId, list);
    }

    return map;
  }

  // Symmetric to `UsersRepository.setSectors`, replacing by sector instead
  // of by user.
  async setResponsibleUsers(sectorId: number, userIds: number[]): Promise<void> {
    await this.sectorUserRepo.delete({ sectorId });

    if (userIds.length) {
      const entries = userIds.map((userId) => this.sectorUserRepo.create({ sectorId, userId }));
      await this.sectorUserRepo.save(entries);
    }
  }

  findUsersByUuids(uuids: string[]): Promise<UserEntity[]> {
    if (!uuids.length) return Promise.resolve([]);

    return this.userRepo.find({ where: { uuid: In(uuids) } });
  }
}
