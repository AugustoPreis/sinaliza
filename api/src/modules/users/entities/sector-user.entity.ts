import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';

import { SectorEntity } from '@modules/sectors/entities/sector.entity';

import { UserEntity } from './user.entity';

@Entity('sector_users')
export class SectorUserEntity {
  @PrimaryColumn({ name: 'user_id', type: 'bigint' })
  userId!: number;

  @PrimaryColumn({ name: 'sector_id', type: 'bigint' })
  sectorId!: number;

  @ManyToOne(() => UserEntity, (user) => user.sectorUsers, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  @ManyToOne(() => SectorEntity, { eager: true })
  @JoinColumn({ name: 'sector_id' })
  sector!: SectorEntity;
}
