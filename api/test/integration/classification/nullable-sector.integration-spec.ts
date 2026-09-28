import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { DataSource } from 'typeorm';

import { NullableAutomaticSector1790467200000 } from '../../../src/core/database/migrations/1790467200000-NullableAutomaticSector';

// Dedicated disposable database; never uses application database credentials.
describe('Nullable automatic sector migration', () => {
  let container: StartedPostgreSqlContainer | undefined;
  let database: DataSource | undefined;
  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:17-alpine').start();
    database = await new DataSource({ type: 'postgres', url: container.getConnectionUri() }).initialize();
  });
  afterAll(async () => {
    if (database?.isInitialized) await database.destroy();
    if (container) await container.stop();
  });
  it('preserves existing values, allows manual records, and refuses lossy rollback', async () => {
    const runner = database!.createQueryRunner();
    await runner.connect();
    try {
      await runner.query('CREATE TABLE tickets (id serial PRIMARY KEY, automatic_sector_id bigint NOT NULL)');
      await runner.query('INSERT INTO tickets (automatic_sector_id) VALUES (42)');
      const migration = new NullableAutomaticSector1790467200000();
      await migration.up(runner);
      await runner.query('INSERT INTO tickets (automatic_sector_id) VALUES (NULL)');
      expect(await runner.query('SELECT automatic_sector_id FROM tickets ORDER BY id')).toEqual([{ automatic_sector_id: '42' }, { automatic_sector_id: null }]);
      await expect(migration.down(runner)).rejects.toThrow();
      expect(await runner.query('SELECT count(*)::int AS count FROM tickets')).toEqual([{ count: 2 }]);
    } finally { await runner.release(); }
  });
});
