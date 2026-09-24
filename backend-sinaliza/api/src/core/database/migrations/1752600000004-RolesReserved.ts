import { MigrationInterface, QueryRunner } from 'typeorm';

export class RolesReserved1752600000004 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE roles ADD COLUMN IF NOT EXISTS is_reserved BOOLEAN NOT NULL DEFAULT false
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE roles DROP COLUMN IF EXISTS is_reserved`);
  }
}
