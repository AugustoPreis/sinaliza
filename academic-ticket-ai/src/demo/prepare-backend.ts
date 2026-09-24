import { readFile, writeFile } from 'node:fs/promises';
import { prepareDemoModel } from './prepare.js';
import { loadTfidfModel } from '../tfidf/model.js';

if (process.env.NODE_ENV === 'production') throw new Error('MOCK_MODEL_NOT_ALLOWED');
const source = await prepareDemoModel();
const artifact = await loadTfidfModel(source);
const mapping = JSON.parse(await readFile('config/backend-demo-sector-map.json', 'utf8')) as {
  kind: string; items: Array<{ modelSectorId: string; id: string; name: string }>;
};
const items = mapping.items;
if (mapping.kind !== 'DEVELOPMENT_MOCK' || !Array.isArray(items) ||
    items.length !== artifact.classifier.classes.length ||
    new Set(items.map(item => item.modelSectorId)).size !== items.length ||
    new Set(items.map(item => item.id)).size !== items.length ||
    items.some(item => !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(item.id))) {
  throw new Error('Mapa de demonstração inválido.');
}
const translate = (id: string): string => {
  const item = items.find(entry => entry.modelSectorId === id);
  if (!item) throw new Error(`Setor sem correspondência explícita: ${id}`);
  return item.id;
};
artifact.classifier.classes = artifact.classifier.classes.map(translate);
artifact.metadata.sectorIds = artifact.metadata.sectorIds.map(translate);
if (artifact.semantic) artifact.semantic.references = artifact.semantic.references.map(reference => ({ ...reference, sectorId: translate(reference.sectorId) }));
artifact.metadata.configuration = { ...artifact.metadata.configuration, demoSectorMapping: mapping };
const output = 'models/demo/backend-tfidf.json';
await writeFile(output, `${JSON.stringify(artifact, null, 2)}\n`);
console.log(`Artefato MOCK para banco separado de demonstração: ${output}`);
console.log('Nenhum setor foi criado no banco. Use somente com os UUIDs do mapa e AI_MODE=mock.');
