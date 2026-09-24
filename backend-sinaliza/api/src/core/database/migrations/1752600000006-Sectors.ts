import { MigrationInterface, QueryRunner } from 'typeorm';

// Minimal `sectors` table + the `sector_users` join table, just enough for
// `UsersRepository.setSectors` / `UpdateUserPermissionsUseCase` to work.
// The full sectors module (categories, responsible-user management, soft
// delete) is added by a later migration, in a later phase.
export class Sectors1752600000006 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS sectors (
        id BIGSERIAL PRIMARY KEY,
        uuid UUID NOT NULL,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS ux_sectors_uuid ON sectors(uuid)`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS sector_users (
        user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        sector_id BIGINT NOT NULL REFERENCES sectors(id) ON DELETE CASCADE,
        PRIMARY KEY (user_id, sector_id)
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS sector_users`);
    await queryRunner.query(`DROP TABLE IF EXISTS sectors`);
  }
}
