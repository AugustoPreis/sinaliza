import { MigrationInterface, QueryRunner } from 'typeorm';

// Phase 3 (`modules/tickets`): `tickets` + `ticket_photos` (mutable) and the
// immutable `ticket_events` timeline (endpoints-sinaliza.md §16/§17), plus
// the dedicated protocol sequence (`TicketsRepository.nextProtocol()`
// formats it as `SIN-<n>`). Starting at 1000 just so early protocols don't
// look suspiciously like a fresh/empty system.
export class Tickets1752600000009 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE ticket_status AS ENUM ('OPEN', 'FORWARDED', 'IN_PROGRESS', 'RESOLVED');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE ticket_event_type AS ENUM (
          'TICKET_OPENED',
          'AUTO_CLASSIFIED',
          'REQUESTER_CONFIRMED_SECTOR',
          'REQUESTER_CHANGED_SECTOR',
          'STATUS_CHANGED',
          'REASSIGNED',
          'TICKET_RESOLVED'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    await queryRunner.query(`CREATE SEQUENCE IF NOT EXISTS ticket_protocol_seq START 1000`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS tickets (
        id BIGSERIAL PRIMARY KEY,
        uuid UUID NOT NULL,
        protocol VARCHAR(32) NOT NULL UNIQUE,
        requester_id BIGINT NOT NULL REFERENCES users(id),
        description TEXT NOT NULL,
        building_id BIGINT NOT NULL REFERENCES buildings(id),
        environment_id BIGINT NOT NULL REFERENCES environments(id),
        automatic_sector_id BIGINT NOT NULL REFERENCES sectors(id),
        confirmed_sector_id BIGINT NOT NULL REFERENCES sectors(id),
        current_sector_id BIGINT NOT NULL REFERENCES sectors(id),
        resolved_by_sector_id BIGINT NULL REFERENCES sectors(id),
        requester_corrected BOOLEAN NOT NULL,
        sector_reclassified BOOLEAN NOT NULL DEFAULT FALSE,
        status ticket_status NOT NULL,
        internal_note TEXT NULL,
        correct_sector_reached_at TIMESTAMPTZ NULL,
        resolved_at TIMESTAMPTZ NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMP NULL
      )
    `);

    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS ux_tickets_uuid ON tickets(uuid)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS ix_tickets_requester_id ON tickets(requester_id)`);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS ix_tickets_current_sector_id ON tickets(current_sector_id)`,
    );
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS ix_tickets_status ON tickets(status)`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ticket_photos (
        id BIGSERIAL PRIMARY KEY,
        uuid UUID NOT NULL,
        ticket_id BIGINT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
        storage_key TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMP NULL
      )
    `);

    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS ux_ticket_photos_uuid ON ticket_photos(uuid)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS ix_ticket_photos_ticket_id ON ticket_photos(ticket_id)`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ticket_events (
        id BIGSERIAL PRIMARY KEY,
        uuid UUID NOT NULL,
        ticket_id BIGINT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
        type ticket_event_type NOT NULL,
        actor_user_id BIGINT NULL REFERENCES users(id),
        actor_role VARCHAR(50) NULL,
        from_sector_id BIGINT NULL REFERENCES sectors(id),
        to_sector_id BIGINT NULL REFERENCES sectors(id),
        from_status ticket_status NULL,
        to_status ticket_status NULL,
        reason TEXT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS ux_ticket_events_uuid ON ticket_events(uuid)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS ix_ticket_events_ticket_id ON ticket_events(ticket_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS ix_ticket_events_to_sector_id ON ticket_events(to_sector_id)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS ticket_events`);
    await queryRunner.query(`DROP TABLE IF EXISTS ticket_photos`);
    await queryRunner.query(`DROP TABLE IF EXISTS tickets`);
    await queryRunner.query(`DROP SEQUENCE IF EXISTS ticket_protocol_seq`);
    await queryRunner.query(`DROP TYPE IF EXISTS ticket_event_type`);
    await queryRunner.query(`DROP TYPE IF EXISTS ticket_status`);
  }
}
