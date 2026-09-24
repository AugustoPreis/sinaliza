import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

// Responsible users aren't a column here - they live in the `sector_users`
// join table (`SectorUserEntity`). No soft delete: sectors are never
// deleted, so `BaseEntity` (which carries `deletedAt`) isn't used here.
@Entity('sectors')
export class SectorEntity {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @Column({ type: 'uuid' })
  uuid!: string;

  @Column({ length: 255 })
  name!: string;

  // Tags matched against a ticket description to auto-classify its sector.
  @Column({ type: 'simple-array', default: '' })
  categories!: string[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
