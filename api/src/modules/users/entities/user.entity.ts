import { Column, Entity, OneToMany } from 'typeorm';

import { Audit, AuditEntity } from '@shared/audit/decorators';
import { EnumFormatter } from '@shared/audit/formatters/enum.formatter';
import { BaseEntity } from '@shared/entities/base.entity';

import { EInstitutionalLink } from '../enums/institutional-link.enum';
import { EUserStatus } from '../enums/user-status.enum';

import { SectorUserEntity } from './sector-user.entity';
import { UserRoleEntity } from './user-role.entity';

@AuditEntity({ name: 'user', module: 'users' })
@Entity('users')
export class UserEntity extends BaseEntity {
  @Audit()
  @Column({ length: 255, unique: true })
  email!: string;

  // Never audited: it's a secret, not just PII.
  @Audit({ ignore: true })
  @Column({ name: 'password_hash', type: 'text', select: false })
  passwordHash!: string;

  @Audit()
  @Column({ length: 255 })
  name!: string;

  // Nullable: not every institutional link has one at import time; unique
  // whenever present (partial unique index, see migration).
  @Audit()
  @Column({ name: 'institutional_id', type: 'varchar', length: 100, nullable: true })
  institutionalId!: string | null;

  @Audit({ formatter: EnumFormatter })
  @Column({
    name: 'institutional_link',
    type: 'enum',
    enum: EInstitutionalLink,
    enumName: 'institutional_link',
    nullable: true,
  })
  institutionalLink!: EInstitutionalLink | null;

  // `INACTIVE` represents "access revoked" (see `RevokeUserAccessUseCase`).
  @Audit({ formatter: EnumFormatter })
  @Column({ type: 'enum', enum: EUserStatus, enumName: 'user_status', default: EUserStatus.ACTIVE })
  status!: EUserStatus;

  // Never audited: `UsersRepository.setRoles` writes directly to the
  // `user_roles` join table without going through `save()`, so the audit
  // subscriber never observes it.
  @Audit({ ignore: true })
  @OneToMany(() => UserRoleEntity, (ur) => ur.user, { eager: true })
  userRoles!: UserRoleEntity[];

  // Same reasoning as `userRoles` above (`UsersRepository.setSectors`).
  @Audit({ ignore: true })
  @OneToMany(() => SectorUserEntity, (su) => su.user, { eager: true })
  sectorUsers!: SectorUserEntity[];
}
