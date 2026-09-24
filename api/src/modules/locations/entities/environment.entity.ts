import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { BuildingEntity } from './building.entity';

@Entity('environments')
export class EnvironmentEntity {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @Column({ type: 'uuid' })
  uuid!: string;

  @Column({ length: 255 })
  name!: string;

  @Column({ name: 'building_id', type: 'bigint' })
  buildingId!: number;

  @ManyToOne(() => BuildingEntity, (building) => building.environments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'building_id' })
  building!: BuildingEntity;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
