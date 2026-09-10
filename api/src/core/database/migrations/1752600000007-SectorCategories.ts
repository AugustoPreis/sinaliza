import { MigrationInterface, QueryRunner } from 'typeorm';

// Stored as a single TEXT column (comma-joined), matching
// `SectorEntity.categories`'s `simple-array` type - no separate
// `sector_categories` table since categories are just short tags with no
// attributes of their own.
export class SectorCategories1752600000007 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE sectors ADD COLUMN IF NOT EXISTS categories TEXT NOT NULL DEFAULT ''
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE sectors DROP COLUMN IF EXISTS categories`);
  }
}
