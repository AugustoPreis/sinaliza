import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

import { IFieldDiff } from '@shared/audit/interfaces';

import { EAuditAction } from '../enums/audit-action.enum';

@Entity('audit_logs', { schema: 'audit' })
export class AuditLogEntity {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @Column({ type: 'uuid' })
  uuid!: string;

  @Column({ name: 'entity_name', length: 255 })
  entityName!: string;

  @Column({ name: 'entity_uuid', type: 'uuid' })
  entityUuid!: string;

  @Column({ type: 'varchar', length: 20 })
  action!: EAuditAction;

  @Column({ name: 'actor_uuid', type: 'uuid', nullable: true })
  actorUuid!: string | null;

  @Column({ type: 'jsonb' })
  changes!: IFieldDiff[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
