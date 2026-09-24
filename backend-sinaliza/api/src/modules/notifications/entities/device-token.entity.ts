import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { UserEntity } from '@modules/users/entities/user.entity';

import { EDevicePlatform } from '../enums/device-platform.enum';

// Unique on `(user_id, token)` (see migration) so registering the same token
// twice is idempotent, matching `DeviceTokensRepository.upsert()`.
@Entity('device_tokens')
export class DeviceTokenEntity {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @Column({ type: 'uuid' })
  uuid!: string;

  @Column({ name: 'user_id', type: 'bigint' })
  userId!: number;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  @Column({ type: 'text' })
  token!: string;

  @Column({ type: 'enum', enum: EDevicePlatform, enumName: 'device_platform' })
  platform!: EDevicePlatform;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
