import { MigrationInterface, QueryRunner } from 'typeorm';

export class AuditLogs1752600000003 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS audit`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS audit.audit_logs (
        id BIGSERIAL PRIMARY KEY,
        uuid UUID NOT NULL,
        entity_name VARCHAR(255) NOT NULL,
        entity_uuid UUID NOT NULL,
        action VARCHAR(20) NOT NULL,
        actor_uuid UUID NULL,
        changes JSONB NOT NULL DEFAULT '[]',
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS ux_audit_logs_uuid ON audit.audit_logs(uuid)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit.audit_logs(entity_name, entity_uuid)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit.audit_logs(actor_uuid)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit.audit_logs(created_at)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS audit.audit_logs`);
    await queryRunner.query(`DROP SCHEMA IF EXISTS audit`);
  }
}
