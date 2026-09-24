import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ClassificationPreviewService, type ClassifierService } from '../src/classification/service.js';
import { generateBalancedDataset, writeDataset } from '../src/dataset/generator.js';
import { stratifiedSplit } from '../src/dataset/split.js';
import { validateDataset } from '../src/dataset/validator.js';
import { InMemoryFeedbackRepository } from '../src/feedback/repository.js';
import { JsonlFeedbackRepository } from '../src/feedback/repository.js';
import { MockSectorProvider, findNewSystemSectorIds } from '../src/sectors/provider.js';
import { loadTfidfModel } from '../src/tfidf/model.js';

const sectors = [
  { id: 'a', name: 'Setor Alfa', active: true, examples: ['não consigo acessar minha conta', 'a página não abre'] },
  { id: 'b', name: 'Setor Beta', active: true, examples: ['o pagamento não foi reconhecido', 'a cobrança veio errada'] },
  { id: 'c', name: 'Setor Gama', active: true, examples: ['preciso emitir um documento', 'meus dados precisam de correção'] },
];

describe('arquitetura desacoplada da IA', () => {
  it('gera exatamente 10.000 registros balanceados, válidos e sem duplicatas excessivas', () => {
    const records = generateBalancedDataset(sectors);
    const validation = validateDataset(records, sectors);
    expect(records).toHaveLength(10_000);
    const counts = Object.values(validation.distribution);
    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
    expect(validation.duplicateRate).toBe(0);
  });

  it('faz split 80/10/10 e bloqueia vazamento por texto duplicado', () => {
    const groupExamples = Array.from({ length: 10 }, (_, index) => `problema diferente ${index + 1} na minha conta`);
    const records = generateBalancedDataset([{ id: 'a', name: 'Setor Alfa', active: true, examples: groupExamples }], 100);
    const split = stratifiedSplit(records);
    expect([split.train.length, split.validation.length, split.test.length]).toEqual([80, 10, 10]);
    expect(() => stratifiedSplit([...records, records[0]!])).toThrow(/vazamento/);
  });

  it('persiste feedback sem retreinar o modelo', async () => {
    const repository = new InMemoryFeedbackRepository();
    await repository.save({ text: 'meu chamado', predictedSectorId: 'a', correctSectorId: 'b', source: 'REQUESTER', createdAt: new Date(0).toISOString(), modelVersion: 'v1' });
    expect(await repository.list()).toHaveLength(1);
  });

  it('usa somente description e retorna sector_id conhecido', async () => {
    const classifier: ClassifierService = { modelSectorIds: ['a'], classify: async () => ({ sectorId: 'a', confidence: 0.9, model: 'mock' }) };
    const service = new ClassificationPreviewService(classifier, new MockSectorProvider([{ id: 'a', name: 'A', active: true, examples: ['exemplo um', 'exemplo dois'] }]));
    await expect(service.preview({ description: 'preciso de ajuda' })).resolves.toMatchObject({ sector_id: 'a', automatic_sector: { id: 'a', name: 'A' } });
    await expect(service.preview({ description: '  ' })).rejects.toThrow(/obrigatória/);
  });

  it('detecta setor novo no sistema e exige retreinamento', async () => {
    expect(findNewSystemSectorIds(sectors, ['a', 'b'])).toEqual(['c']);
    const classifier: ClassifierService = { modelSectorIds: ['a'], classify: async () => ({ sectorId: 'a', confidence: 1, model: 'mock' }) };
    const service = new ClassificationPreviewService(classifier, new MockSectorProvider(sectors));
    await expect(service.preview({ description: 'teste' })).rejects.toThrow(/retreinamento/);
  });

  it('exporta CSV UTF-8 no contrato text/sector_id', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'sinaliz-ai-'));
    const path = join(directory, 'dataset.csv');
    await writeDataset(path, [{ originalText: 'descrição com acento', sectorId: 'a', sourceExampleId: 'a:1', groupId: 'a:1' }]);
    expect(await readFile(path, 'utf8')).toContain('text,sector_id,source_example_id,group_id');
  });

  it('falha de forma clara com modelo ausente ou corrompido', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'sinaliz-model-'));
    await expect(loadTfidfModel(join(directory, 'ausente.json'))).rejects.toThrow();
    const corrupt = join(directory, 'corrompido.json');
    await writeFile(corrupt, '{inválido', 'utf8');
    await expect(loadTfidfModel(corrupt)).rejects.toThrow();
  });

  it('isola linha JSONL corrompida e preserva feedback válido', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'sinaliz-feedback-'));
    const path = join(directory, 'feedback.jsonl');
    const repository = new JsonlFeedbackRepository(path);
    await repository.save({ text: 'exemplo', predictedSectorId: 'a', correctSectorId: 'b', source: 'SECTOR', createdAt: new Date().toISOString(), modelVersion: 'v1' });
    await writeFile(path, `${await readFile(path, 'utf8')}{linha-inválida\n`, 'utf8');
    expect(await repository.list()).toHaveLength(1);
  });
});
