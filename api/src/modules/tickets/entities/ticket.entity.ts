import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';

import { BaseEntity } from '@shared/entities/base.entity';

import { BuildingEntity } from '@modules/locations/entities/building.entity';
import { EnvironmentEntity } from '@modules/locations/entities/environment.entity';
import { SectorEntity } from '@modules/sectors/entities/sector.entity';
import { UserEntity } from '@modules/users/entities/user.entity';

import { ETicketStatus } from '../enums/ticket-status.enum';

import { TicketEventEntity } from './ticket-event.entity';
import { TicketPhotoEntity } from './ticket-photo.entity';

// `automaticSectorId`/`confirmedSectorId` are write-once (RB-03/RB-04) -
// nothing updates them after `CreateTicketUseCase` sets them.
// `currentSectorId` is the only sector FK meant to be mutated later (RB-05).
@Entity('tickets')
export class TicketEntity extends BaseEntity {
  @Column({ length: 32, unique: true })
  protocol!: string;

  @Column({ name: 'requester_id', type: 'bigint' })
  requesterId!: number;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'requester_id' })
  requester!: UserEntity;

  @Column({ type: 'text' })
  description!: string;

  @Column({ name: 'building_id', type: 'bigint' })
  buildingId!: number;

  @ManyToOne(() => BuildingEntity)
  @JoinColumn({ name: 'building_id' })
  building!: BuildingEntity;

  @Column({ name: 'environment_id', type: 'bigint' })
  environmentId!: number;

  @ManyToOne(() => EnvironmentEntity)
  @JoinColumn({ name: 'environment_id' })
  environment!: EnvironmentEntity;

  @Column({ name: 'automatic_sector_id', type: 'bigint' })
  automaticSectorId!: number;

  @ManyToOne(() => SectorEntity)
  @JoinColumn({ name: 'automatic_sector_id' })
  automaticSector!: SectorEntity;

  @Column({ name: 'confirmed_sector_id', type: 'bigint' })
  confirmedSectorId!: number;

  @ManyToOne(() => SectorEntity)
  @JoinColumn({ name: 'confirmed_sector_id' })
  confirmedSector!: SectorEntity;

  // Mutable (RB-05): the reassign flow updates this and appends a
  // `REASSIGNED` event instead of overwriting `confirmedSectorId`.
  @Column({ name: 'current_sector_id', type: 'bigint' })
  currentSectorId!: number;

  @ManyToOne(() => SectorEntity)
  @JoinColumn({ name: 'current_sector_id' })
  currentSector!: SectorEntity;

  @Column({ name: 'resolved_by_sector_id', type: 'bigint', nullable: true })
  resolvedBySectorId!: number | null;

  @ManyToOne(() => SectorEntity, { nullable: true })
  @JoinColumn({ name: 'resolved_by_sector_id' })
  resolvedBySector!: SectorEntity | null;

  @Column({ name: 'requester_corrected', type: 'boolean' })
  requesterCorrected!: boolean;

  @Column({ name: 'sector_reclassified', type: 'boolean', default: false })
  sectorReclassified!: boolean;

  @Column({ type: 'enum', enum: ETicketStatus, enumName: 'ticket_status' })
  status!: ETicketStatus;

  // Setor/admin only - never surfaced to the requester.
  @Column({ name: 'internal_note', type: 'text', nullable: true })
  internalNote!: string | null;

  @Column({ name: 'correct_sector_reached_at', type: 'timestamptz', nullable: true })
  correctSectorReachedAt!: Date | null;

  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true })
  resolvedAt!: Date | null;

  @OneToMany(() => TicketPhotoEntity, (photo) => photo.ticket)
  photos!: TicketPhotoEntity[];

  @OneToMany(() => TicketEventEntity, (event) => event.ticket)
  events!: TicketEventEntity[];
}
