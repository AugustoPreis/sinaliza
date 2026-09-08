import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { EnvironmentEntity } from './environment.entity';

// No admin screen manages buildings/environments in this version — see
// `LocationsSeeder` for the dev-only sample data.
@Entity('buildings')
export class BuildingEntity {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @Column({ type: 'uuid' })
  uuid!: string;

  @Column({ length: 255 })
  name!: string;

  @OneToMany(() => EnvironmentEntity, (environment) => environment.building)
  environments!: EnvironmentEntity[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
