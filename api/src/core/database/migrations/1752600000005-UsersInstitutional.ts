import { MigrationInterface, QueryRunner } from 'typeorm';

// Sinaliza adaptation: `users.avatar_url` is dropped (no avatar screen in
// this product), replaced by `institutional_id` (matrícula) and
// `institutional_link` (ALUNO | PROFESSOR | SERVIDOR). `status` is kept
// as-is — `INACTIVE` now means "access revoked" (RB-13), not a new column.
export class UsersInstitutional1752600000005 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE institutional_link AS ENUM ('ALUNO', 'PROFESSOR', 'SERVIDOR');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    await queryRunner.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS institutional_id VARCHAR(100)
    `);

    await queryRunner.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS institutional_link institutional_link
    `);

    // Partial unique index: `institutional_id` is unique only when present,
    // since not every imported user necessarily has a matrícula.
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS ux_users_institutional_id
        ON users(institutional_id)
        WHERE institutional_id IS NOT NULL
    `);

    await queryRunner.query(`ALTER TABLE users DROP COLUMN IF EXISTS avatar_url`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT`);
    await queryRunner.query(`DROP INDEX IF EXISTS ux_users_institutional_id`);
    await queryRunner.query(`ALTER TABLE users DROP COLUMN IF EXISTS institutional_link`);
    await queryRunner.query(`ALTER TABLE users DROP COLUMN IF EXISTS institutional_id`);
    await queryRunner.query(`DROP TYPE IF EXISTS institutional_link`);
  }
}
