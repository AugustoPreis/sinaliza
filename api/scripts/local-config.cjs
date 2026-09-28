// Operational helpers for the isolated local homologation database only.
const fs = require('node:fs');
const path = require('node:path');
const dotenv = require('dotenv');
const root = path.resolve(__dirname, '..');
const config = {};
for (const file of ['.env', '.env.local']) {
  const target = path.join(root, file);
  if (fs.existsSync(target)) Object.assign(config, dotenv.parse(fs.readFileSync(target)));
}
if (!['127.0.0.1', 'localhost'].includes(config.DB_HOST) ||
    config.DB_NAME !== 'sinaliza_local' || config.DB_SCHEMA !== 'public' ||
    config.NODE_ENV !== 'development') {
  throw new Error('Use somente a configuração de homologação local: loopback, sinaliza_local, public, development.');
}
module.exports = { root, config };
