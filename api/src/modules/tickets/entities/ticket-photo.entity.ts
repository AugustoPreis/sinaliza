import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';

import { BaseEntity } from '@shared/entities/base.entity';

import { TicketEntity } from './ticket.entity';

// One row per uploaded photo (endpoints-sinaliza.md §8.1/§16). Only
// `storageKey` is persisted — the public URL is derived on read via
// `StorageService.publicUrl()`, same idea as the (now removed) avatar
// upload from Phase 1.
@Entity('ticket_photos')
export class TicketPhotoEntity extends BaseEntity {
  @Column({ name: 'ticket_id', type: 'bigint' })
  ticketId!: number;

  @ManyToOne(() => TicketEntity, (ticket) => ticket.photos, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ticket_id' })
  ticket!: TicketEntity;

  @Column({ name: 'storage_key', type: 'text' })
  storageKey!: string;
}
