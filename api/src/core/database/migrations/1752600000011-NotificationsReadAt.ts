import { MigrationInterface, QueryRunner } from 'typeorm';

// Read state for the requester's notification history (unread badge on the
// app's Notifications tab). NULL = unread.
export class NotificationsReadAt1752600000011 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE notifications ADD COLUMN IF NOT EXISTS read_at TIMESTAMP NULL`,
    );

    // Partial index: the unread count only ever looks at NULL rows.
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS ix_notifications_user_unread
         ON notifications(user_id) WHERE read_at IS NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS ix_notifications_user_unread`);
    await queryRunner.query(`ALTER TABLE notifications DROP COLUMN IF EXISTS read_at`);
  }
}
