// Run with the API stopped so ticket writes cannot invalidate the comparison.
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { Client } = require('pg');
const { root, config } = require('./local-config.cjs');
const client = new Client({ host: config.DB_HOST, port: Number(config.DB_PORT),
  user: config.DB_USERNAME, password: config.DB_PASSWORD, database: config.DB_NAME,
  connectionTimeoutMillis: 5000 });
async function ticketSnapshot() {
  const exists = (await client.query("SELECT to_regclass('public.tickets') IS NOT NULL AS present")).rows[0].present;
  if (!exists) return null;
  return (await client.query(`SELECT count(*)::text AS count,
    md5(COALESCE(string_agg(md5(to_jsonb(t)::text), '' ORDER BY id), '')) AS digest
    FROM public.tickets t`)).rows[0];
}
(async () => {
  await client.connect();
  const before = await ticketSnapshot();
  const result = spawnSync('npm', ['run', 'migration:run'], {
    cwd: root, env: { ...process.env, ...config }, stdio: 'inherit',
  });
  assert.equal(result.status, 0, 'migration:run falhou; não declarar validação.');
  const column = (await client.query(`SELECT is_nullable FROM information_schema.columns
    WHERE table_schema='public' AND table_name='tickets' AND column_name='automatic_sector_id'`)).rows[0];
  assert.equal(column?.is_nullable, 'YES');
  const after = await ticketSnapshot();
  if (before) assert.deepEqual(after, before, 'Conteúdo de tickets mudou; investigar antes de continuar.');
  const migration = (await client.query('SELECT name FROM public.migrations WHERE name = $1',
    ['NullableAutomaticSector1790467200000'])).rows;
  assert.equal(migration.length, 1);
  console.log(JSON.stringify({ nullable: true, migrationRecorded: true,
    existingTickets: before?.count ?? 'tabela inexistente antes das migrations',
    ticketsAfter: after.count, existingTicketContentsPreserved: before ? true : null }));
})().catch(error => {
  console.error('Migração/verificação local falhou:', error.code || error.name);
  process.exitCode = 1;
}).finally(() => client.end());
