import { Column, Entity, JoinTable, ManyToMany, PrimaryGeneratedColumn } from 'typeorm';

import { Audit, AuditEntity } from '@shared/audit/decorators';
import { ArrayNormalizer } from '@shared/audit/normalizers/array.normalizer';

import { PermissionsRelationResolver } from '../relation-resolvers/permissions.relation-resolver';

import { PermissionEntity } from './permission.entity';

@AuditEntity({ name: 'role', module: 'roles' })
@Entity('roles')
export class RoleEntity {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @Column({ type: 'uuid' })
  uuid!: string;

  @Audit()
  @Column({ length: 100, unique: true })
  name!: string;

  @Audit()
  @Column({ type: 'text', nullable: true })
  description!: string | null;

  // System-managed only (set by RolesSeeder), never through a DTO: not user-editable.
  @Column({ name: 'is_reserved', type: 'boolean', default: false })
  isReserved!: boolean;

  @Audit({ relationResolver: PermissionsRelationResolver, normalizer: ArrayNormalizer })
  @ManyToMany(() => PermissionEntity, (perm) => perm.roles, { eager: true })
  @JoinTable({
    name: 'role_permissions',
    joinColumn: { name: 'role_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'permission_id', referencedColumnName: 'id' },
  })
  permissions!: PermissionEntity[];
}
