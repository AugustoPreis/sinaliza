import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { TicketEntity } from '@modules/tickets/entities/ticket.entity';
import { UserEntity } from '@modules/users/entities/user.entity';

import { ENotificationType } from '../enums/notification-type.enum';

// Like `TicketEventEntity`, an immutable historical fact (no `updatedAt`):
// it's either created, or it never happened.
@Entity('notifications')
export class NotificationEntity {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @Column({ type: 'uuid' })
  uuid!: string;

  @Column({ name: 'user_id', type: 'bigint' })
  userId!: number;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  @Column({ name: 'ticket_id', type: 'bigint' })
  ticketId!: number;

  @ManyToOne(() => TicketEntity)
  @JoinColumn({ name: 'ticket_id' })
  ticket!: TicketEntity;

  @Column({ type: 'enum', enum: ENotificationType, enumName: 'notification_type' })
  type!: ENotificationType;

  @Column({ type: 'text' })
  message!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
