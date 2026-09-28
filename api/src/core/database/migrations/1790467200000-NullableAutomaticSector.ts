import { MigrationInterface, QueryRunner } from 'typeorm';

export class NullableAutomaticSector1790467200000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE tickets ALTER COLUMN automatic_sector_id DROP NOT NULL');
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL refuses this rollback if manual tickets exist; never fabricate a sector or delete records.
    await queryRunner.query('ALTER TABLE tickets ALTER COLUMN automatic_sector_id SET NOT NULL');
  }
}
