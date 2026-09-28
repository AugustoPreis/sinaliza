// Real local flow: auth/CSRF -> live catalog -> API -> local AI -> PostgreSQL.
const assert = require('node:assert/strict');
const { Pool } = require('pg');
const { config } = require('./local-config.cjs');

const base = `http://127.0.0.1:${Number(config.PORT || 3000)}/${config.API_PREFIX || 'api'}/v1`;
const cookies = new Map();

async function request(route, method = 'GET', body, expectedStatus) {
  const isForm = body instanceof FormData;
  const response = await fetch(base + route, {
    method,
    redirect: 'error',
    signal: AbortSignal.timeout(60000),
    headers: {
      ...(isForm ? {} : { 'content-type': 'application/json' }),
      cookie: [...cookies].map(([key, value]) => `${key}=${value}`).join('; '),
      ...(cookies.has('XSRF-TOKEN')
        ? { 'X-XSRF-TOKEN': decodeURIComponent(cookies.get('XSRF-TOKEN')) }
        : {}),
    },
    ...(body === undefined
      ? {}
      : { body: isForm ? body : JSON.stringify(body) }),
  });
  for (const value of response.headers.getSetCookie()) {
    const pair = value.split(';')[0];
    const split = pair.indexOf('=');
    cookies.set(pair.slice(0, split), pair.slice(split + 1));
  }
  const envelope = await response.json().catch(() => null);
  if (expectedStatus !== undefined) {
    assert.equal(response.status, expectedStatus, `${method} ${route}`);
    return envelope;
  }
  if (!response.ok) {
    throw new Error(`${method} ${route}: HTTP ${response.status} ${JSON.stringify(envelope)}`);
  }
  assert.equal(envelope.success, true);
  return envelope.data;
}

function checkClassification(data, catalog) {
  assert.equal(data.classification.method, 'dynamic-semantic-cosine-v1');
  assert.equal(data.classification.data_source, 'REAL');
  assert.equal(data.classification.score_type, 'uncalibrated_score');
  assert.ok(data.confidence >= 0 && data.confidence <= 1);
  if (data.automatic_sector !== null) {
    assert.ok(catalog.some((sector) => sector.id === data.automatic_sector.id));
  }
}

function ticketForm(description, location, confirmedSectorId, automaticSectorId) {
  const form = new FormData();
  form.set('description', description);
  form.set('location', JSON.stringify({
    building_id: location.buildingId,
    environment_id: location.environmentId,
  }));
  if (automaticSectorId !== null) form.set('automatic_sector_id', automaticSectorId);
  form.set('confirmed_sector_id', confirmedSectorId);
  return form;
}

(async () => {
  assert.ok(config.ADMIN_EMAIL && config.ADMIN_PASSWORD, 'Configure o administrador local e execute seed.');
  await request('/auth/login', 'POST', {
    identifier: config.ADMIN_EMAIL,
    password: config.ADMIN_PASSWORD,
  });

  let catalog = (await request('/admin/sectors')).items;
  let primary = catalog.find((sector) => sector.name === 'Recursos Humanos');
  if (!primary) {
    primary = await request('/admin/sectors', 'POST', {
      name: 'Recursos Humanos',
      categories: ['férias', 'folha de pagamento', 'contracheque', 'funcionário', 'contratação', 'benefícios', 'afastamento', 'dados funcionais'],
    });
  }
  let secondary = catalog.find((sector) => sector.name.startsWith('Homologação local - Astronomia'));
  if (!secondary) {
    secondary = await request('/admin/sectors', 'POST', {
      name: 'Homologação local - Astronomia Experimental',
      categories: ['calibração de telescópio', 'espectrógrafo estelar', 'observatório astronômico'],
    });
  }
  catalog = (await request('/admin/sectors')).items;

  const locations = await request('/locations');
  const building = locations.buildings[0];
  const environment = building?.environments[0];
  assert.ok(building && environment, 'Seed não forneceu prédio/ambiente.');
  const location = { buildingId: building.id, environmentId: environment.id };

  const acceptedDescription =
    'Preciso tratar férias de funcionários, folha de pagamento e contracheque no setor de recursos humanos.';
  const acceptedPreview = await request('/classification/preview', 'POST', {
    description: acceptedDescription,
  });
  checkClassification(acceptedPreview, catalog);
  assert.equal(acceptedPreview.automatic_sector?.id, primary.id);

  const accepted = await request(
    '/tickets',
    'POST',
    ticketForm(acceptedDescription, location, primary.id, primary.id),
  );
  assert.equal(accepted.automatic_sector.id, primary.id);
  assert.equal(accepted.confirmed_sector.id, primary.id);
  assert.equal(accepted.requester_corrected, false);

  const corrected = await request(
    '/tickets',
    'POST',
    ticketForm(acceptedDescription, location, secondary.id, primary.id),
  );
  assert.equal(corrected.automatic_sector.id, primary.id);
  assert.equal(corrected.confirmed_sector.id, secondary.id);
  assert.equal(corrected.requester_corrected, true);

  const abstentionDescription = 'ajuda';
  const abstentionPreview = await request('/classification/preview', 'POST', {
    description: abstentionDescription,
  });
  checkClassification(abstentionPreview, catalog);
  assert.equal(abstentionPreview.automatic_sector, null);
  assert.equal(abstentionPreview.classification.requires_review, true);
  const abstention = await request(
    '/tickets',
    'POST',
    ticketForm(abstentionDescription, location, secondary.id, null),
  );
  assert.equal(abstention.automatic_sector, null);
  assert.equal(abstention.confirmed_sector.id, secondary.id);
  assert.equal(abstention.requester_corrected, false);

  const beforeStale = await request('/tickets?limit=100');
  const stale = await request(
    '/tickets',
    'POST',
    ticketForm(acceptedDescription, location, primary.id, secondary.id),
    409,
  );
  assert.equal(stale.code, 'STALE_CLASSIFICATION');
  const afterStale = await request('/tickets?limit=100');
  assert.equal(afterStale.items.length, beforeStale.items.length);

  secondary = await request(`/admin/sectors/${secondary.id}`, 'PATCH', {
    name: 'Homologação local - Astronomia Quântica',
    categories: ['interferometria quântica', 'fótons emaranhados', 'óptica quântica astronômica'],
  });
  catalog = (await request('/admin/sectors')).items;
  const dynamicPreview = await request('/classification/preview', 'POST', {
    description: 'Preciso analisar interferometria quântica, fótons emaranhados e óptica quântica astronômica.',
  });
  checkClassification(dynamicPreview, catalog);
  assert.equal(dynamicPreview.automatic_sector?.id, secondary.id);
  assert.equal(dynamicPreview.automatic_sector?.name, secondary.name);

  const pool = new Pool({
    host: config.DB_HOST,
    port: Number(config.DB_PORT),
    database: config.DB_NAME,
    user: config.DB_USERNAME,
    password: config.DB_PASSWORD,
  });
  try {
    const persisted = await pool.query(
      `SELECT t.uuid, t.automatic_sector_id, t.confirmed_sector_id,
              t.requester_corrected, a.uuid AS automatic_uuid, c.uuid AS confirmed_uuid
         FROM tickets t
         LEFT JOIN sectors a ON a.id = t.automatic_sector_id
         JOIN sectors c ON c.id = t.confirmed_sector_id
        WHERE t.uuid = ANY($1::uuid[])
        ORDER BY t.created_at`,
      [[accepted.id, corrected.id, abstention.id]],
    );
    assert.equal(persisted.rows.length, 3);
    const byId = new Map(persisted.rows.map((row) => [row.uuid, row]));
    assert.equal(byId.get(accepted.id).automatic_uuid, primary.id);
    assert.equal(byId.get(accepted.id).confirmed_uuid, primary.id);
    assert.equal(byId.get(corrected.id).automatic_uuid, primary.id);
    assert.equal(byId.get(corrected.id).confirmed_uuid, secondary.id);
    assert.equal(byId.get(corrected.id).requester_corrected, true);
    assert.equal(byId.get(abstention.id).automatic_sector_id, null);
    assert.equal(byId.get(abstention.id).automatic_uuid, null);
    assert.equal(byId.get(abstention.id).confirmed_uuid, secondary.id);
  } finally {
    await pool.end();
  }

  console.log(JSON.stringify({
    authenticationAndCsrf: 'OK',
    realCatalogSize: catalog.length,
    apiToLocalAi: 'OK',
    accepted: { protocol: accepted.protocol, persisted: 'OK' },
    corrected: { protocol: corrected.protocol, persisted: 'OK' },
    abstention: { protocol: abstention.protocol, automaticSector: null, persisted: 'OK' },
    staleClassification: 'HTTP 409, sem persistência',
    dynamicSector: { idPreservedAfterUpdate: secondary.id, refreshedName: secondary.name },
  }));
})().catch((error) => {
  console.error('Smoke da API falhou:', error instanceof TypeError ? 'API local inacessível' : error.message);
  process.exitCode = 1;
});
