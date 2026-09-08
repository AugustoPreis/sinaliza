import { MigrationInterface, QueryRunner } from 'typeorm';

// `notifications` and `device_tokens` have no functional dependency on each
// other beyond the FKs below, so both live in one migration.
export class Notifications1752600000010 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE notification_type AS ENUM (
          'TICKET_STATUS_CHANGED',
          'TICKET_REASSIGNED',
          'TICKET_RESOLVED'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE device_platform AS ENUM ('ANDROID', 'IOS', 'WEB');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id BIGSERIAL PRIMARY KEY,
        uuid UUID NOT NULL,
        user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        ticket_id BIGINT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
        type notification_type NOT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS ux_notifications_uuid ON notifications(uuid)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS ix_notifications_user_id ON notifications(user_id)`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS device_tokens (
        id BIGSERIAL PRIMARY KEY,
        uuid UUID NOT NULL,
        user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token TEXT NOT NULL,
        platform device_platform NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS ux_device_tokens_uuid ON device_tokens(uuid)`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS ux_device_tokens_user_id_token ON device_tokens(user_id, token)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS device_tokens`);
    await queryRunner.query(`DROP TABLE IF EXISTS notifications`);
    await queryRunner.query(`DROP TYPE IF EXISTS device_platform`);
    await queryRunner.query(`DROP TYPE IF EXISTS notification_type`);
  }
}
