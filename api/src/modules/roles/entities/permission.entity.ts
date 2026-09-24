import { Column, Entity, Index, ManyToMany, PrimaryGeneratedColumn } from 'typeorm';

import { Audit, AuditEntity } from '@shared/audit/decorators';

import type { RoleEntity } from './role.entity';

@AuditEntity({ name: 'permission', module: 'roles' })
@Entity('permissions')
@Index(['resource', 'action'], { unique: true })
export class PermissionEntity {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @Column({ type: 'uuid' })
  uuid!: string;

  @Audit()
  @Column({ length: 100 })
  resource!: string;

  @Audit()
  @Column({ length: 50 })
  action!: string;

  @Audit()
  @Column({ type: 'text', nullable: true })
  description!: string | null;

  // Not decorated with @Audit(): the same diff is already captured from the
  // owning side, on `Role.permissions`, so decorating this inverse side too
  // would duplicate it.
  // Target/inverse side given as strings (rather than `() => RoleEntity`) so
  // this file never needs a value-level import of `role.entity.ts`; it only
  // needs `RoleEntity` as a type. `role.entity.ts` (indirectly, via
  // `@Audit({ relationResolver: PermissionsRelationResolver })`) now pulls in
  // `PermissionsRepository`, whose `@InjectRepository(PermissionEntity)`
  // needs an *immediate* (non-lazy) value of `PermissionEntity` at import
  // time; a value-level `RoleEntity` import here would turn that into a real
  // circular `require()` that crashes under some module load orders.
  @ManyToMany('RoleEntity', 'permissions')
  roles!: RoleEntity[];
}
