// Idempotent institutional catalog setup for the isolated local homologation environment.
const assert = require('node:assert/strict');
const { config } = require('./local-config.cjs');

const base = `http://127.0.0.1:${Number(config.PORT || 3000)}/${config.API_PREFIX || 'api'}/v1`;
const cookies = new Map();
const legacyHumanResourcesName = 'Homologação local - Recursos Humanos';
const catalogDefinition = [
  {
    name: 'TI',
    categories: [
      'acesso ao sistema', 'computador e notebook', 'internet e wi-fi', 'senha e autenticação',
      'projetor', 'software e aplicativos', 'portal acadêmico', 'impressora',
    ],
  },
  {
    name: 'Financeiro',
    categories: [
      'boleto', 'mensalidade', 'pagamento', 'segunda via', 'cobrança', 'bolsa e desconto',
      'parcelas', 'comprovante de pagamento',
    ],
  },
  {
    name: 'Recursos Humanos',
    categories: [
      'férias', 'folha de pagamento', 'contracheque', 'funcionário', 'contratação', 'benefícios',
      'afastamento', 'dados funcionais',
    ],
  },
  {
    name: 'Secretaria Acadêmica',
    categories: [
      'matrícula e rematrícula', 'histórico escolar', 'documentos acadêmicos', 'disciplinas',
      'trancamento', 'declaração de matrícula', 'diploma', 'aproveitamento de disciplina',
    ],
  },
  {
    name: 'Biblioteca',
    categories: [
      'empréstimo de livro', 'devolução', 'renovação', 'multa', 'acervo', 'reserva de obra',
      'periódicos', 'biblioteca digital',
    ],
  },
  {
    name: 'Infraestrutura',
    categories: [
      'sala de aula', 'ar-condicionado', 'iluminação', 'mobiliário', 'manutenção predial',
      'vazamento', 'tomada e energia elétrica', 'portas e janelas',
    ],
  },
];

function assertLocalHomologation() {
  assert.ok(['127.0.0.1', 'localhost'].includes(config.DB_HOST), 'DB_HOST deve ser local.');
  assert.equal(config.DB_NAME, 'sinaliza_local', 'DB_NAME deve ser sinaliza_local.');
  assert.equal(config.DB_SCHEMA, 'public', 'DB_SCHEMA deve ser public.');
  assert.equal(config.NODE_ENV, 'development', 'NODE_ENV deve ser development.');
}

async function request(route, method = 'GET', body) {
  const response = await fetch(base + route, {
    method,
    redirect: 'error',
    signal: AbortSignal.timeout(30000),
    headers: {
      'content-type': 'application/json',
      cookie: [...cookies].map(([key, value]) => `${key}=${value}`).join('; '),
      ...(cookies.has('XSRF-TOKEN')
        ? { 'X-XSRF-TOKEN': decodeURIComponent(cookies.get('XSRF-TOKEN')) }
        : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

  for (const value of response.headers.getSetCookie()) {
    const pair = value.split(';')[0];
    const separator = pair.indexOf('=');
    cookies.set(pair.slice(0, separator), pair.slice(separator + 1));
  }

  const envelope = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`${method} ${route}: HTTP ${response.status} ${JSON.stringify(envelope)}`);
  }
  assert.equal(envelope?.success, true, `${method} ${route} deve retornar envelope de sucesso.`);
  return envelope.data;
}

function sameCategories(current, desired) {
  return current.length === desired.length && current.every((value, index) => value === desired[index]);
}

async function listCatalog() {
  return (await request('/admin/sectors')).items;
}

(async () => {
  assertLocalHomologation();
  assert.ok(config.ADMIN_EMAIL && config.ADMIN_PASSWORD, 'Configure o administrador local e execute npm run seed.');

  await request('/auth/login', 'POST', {
    identifier: config.ADMIN_EMAIL,
    password: config.ADMIN_PASSWORD,
  });

  let catalog = await listCatalog();
  const canonicalHumanResources = catalog.find((sector) => sector.name === 'Recursos Humanos');
  const legacyHumanResources = catalog.find((sector) => sector.name === legacyHumanResourcesName);

  if (canonicalHumanResources && legacyHumanResources && canonicalHumanResources.id !== legacyHumanResources.id) {
    throw new Error('Catálogo contém RH canônico e RH legado distintos; resolva o conflito manualmente sem apagar dados.');
  }

  const humanResourcesDefinition = catalogDefinition.find((sector) => sector.name === 'Recursos Humanos');
  assert.ok(humanResourcesDefinition);
  if (!canonicalHumanResources && legacyHumanResources) {
    await request(`/admin/sectors/${legacyHumanResources.id}`, 'PATCH', {
      name: humanResourcesDefinition.name,
      categories: humanResourcesDefinition.categories,
    });
    console.log(`updated ${legacyHumanResources.id} ${legacyHumanResourcesName} -> Recursos Humanos`);
    catalog = await listCatalog();
  }

  for (const definition of catalogDefinition) {
    const existing = catalog.find((sector) => sector.name === definition.name);
    if (!existing) {
      const created = await request('/admin/sectors', 'POST', definition);
      console.log(`created ${created.id} ${created.name}`);
      catalog.push(created);
      continue;
    }

    if (!sameCategories(existing.categories ?? [], definition.categories)) {
      const updated = await request(`/admin/sectors/${existing.id}`, 'PATCH', {
        name: definition.name,
        categories: definition.categories,
      });
      console.log(`updated ${updated.id} ${updated.name}`);
      Object.assign(existing, updated);
      continue;
    }

    console.log(`unchanged ${existing.id} ${existing.name}`);
  }

  catalog = await listCatalog();
  console.log(JSON.stringify({
    environment: 'local-homologation',
    total: catalog.length,
    sectors: catalog.map(({ id, name, categories }) => ({ id, name, categories })),
  }, null, 2));
})().catch((error) => {
  console.error('Preparação do catálogo local falhou:', error instanceof TypeError ? 'API local inacessível' : error.message);
  process.exitCode = 1;
});
