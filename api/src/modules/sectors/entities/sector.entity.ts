import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

// Phase 2: adds `categories`, the tag list the keyword classifier
// (`modules/classification`) matches against a ticket description to pick a
// sector. Responsible users aren't a column here — they live in the
// `sector_users` join table (`SectorUserEntity`), same as Phase 1 left it.
// No soft delete: the functional doc (endpoints-sinaliza.md §12.3) explicitly
// doesn't ask for sector deletion, so `BaseEntity` (which carries
// `deletedAt`) isn't used here.
@Entity('sectors')
export class SectorEntity {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @Column({ type: 'uuid' })
  uuid!: string;

  @Column({ length: 255 })
  name!: string;

  // Stored as `simple-array` (a single comma-joined TEXT column) — categories
  // are short tags ("vazamento", "elétrica"...) with no need for a separate
  // table; TypeORM (de)serializes the array transparently.
  @Column({ type: 'simple-array', default: '' })
  categories!: string[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
