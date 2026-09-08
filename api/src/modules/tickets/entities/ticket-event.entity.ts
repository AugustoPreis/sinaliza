import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { SectorEntity } from '@modules/sectors/entities/sector.entity';
import { UserEntity } from '@modules/users/entities/user.entity';

import { ETicketEventType } from '../enums/ticket-event-type.enum';
import { ETicketStatus } from '../enums/ticket-status.enum';

import { TicketEntity } from './ticket.entity';

// No `updatedAt`/soft delete on purpose: an event is a historical fact,
// never edited or removed (RB-15). `actorUserId`/`actorRole` are nullable
// because `AUTO_CLASSIFIED` has no human actor.
@Entity('ticket_events')
export class TicketEventEntity {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @Column({ type: 'uuid' })
  uuid!: string;

  @Column({ name: 'ticket_id', type: 'bigint' })
  ticketId!: number;

  @ManyToOne(() => TicketEntity, (ticket) => ticket.events, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ticket_id' })
  ticket!: TicketEntity;

  @Column({ type: 'enum', enum: ETicketEventType, enumName: 'ticket_event_type' })
  type!: ETicketEventType;

  @Column({ name: 'actor_user_id', type: 'bigint', nullable: true })
  actorUserId!: number | null;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'actor_user_id' })
  actorUser!: UserEntity | null;

  @Column({ name: 'actor_role', type: 'varchar', length: 50, nullable: true })
  actorRole!: string | null;

  @Column({ name: 'from_sector_id', type: 'bigint', nullable: true })
  fromSectorId!: number | null;

  @ManyToOne(() => SectorEntity, { nullable: true })
  @JoinColumn({ name: 'from_sector_id' })
  fromSector!: SectorEntity | null;

  @Column({ name: 'to_sector_id', type: 'bigint', nullable: true })
  toSectorId!: number | null;

  @ManyToOne(() => SectorEntity, { nullable: true })
  @JoinColumn({ name: 'to_sector_id' })
  toSector!: SectorEntity | null;

  @Column({
    name: 'from_status',
    type: 'enum',
    enum: ETicketStatus,
    enumName: 'ticket_status',
    nullable: true,
  })
  fromStatus!: ETicketStatus | null;

  @Column({
    name: 'to_status',
    type: 'enum',
    enum: ETicketStatus,
    enumName: 'ticket_status',
    nullable: true,
  })
  toStatus!: ETicketStatus | null;

  @Column({ type: 'text', nullable: true })
  reason!: string | null;

  @CreateDateColumn()
  createdAt!: Date;
}
