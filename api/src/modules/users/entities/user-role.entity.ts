import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';

import { RoleEntity } from '@modules/roles/entities/role.entity';

import { UserEntity } from './user.entity';

@Entity('user_roles')
export class UserRoleEntity {
  @PrimaryColumn({ name: 'user_id', type: 'bigint' })
  userId!: number;

  @PrimaryColumn({ name: 'role_id', type: 'bigint' })
  roleId!: number;

  @ManyToOne(() => UserEntity, (user) => user.userRoles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  @ManyToOne(() => RoleEntity, { eager: true })
  @JoinColumn({ name: 'role_id' })
  role!: RoleEntity;
}
