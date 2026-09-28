import { describe, expect, it } from 'vitest';
import { classifyDynamic, effectiveMinimumScore, type Candidate, type Embedder } from '../src/classification/dynamic.js';
import policy from '../config/dynamic-policy.json' with { type: 'json' };
const candidate = (n: number, name: string, categories: string[]): Candidate => ({ id: `30000000-0000-4000-8000-${String(n).padStart(12,'0')}`, name, categories });
// Controlled vectors test routing and abstention, not semantic model quality.
const embed: Embedder = async texts => texts.map(t => t.includes('férias') ? [0,1,0] : t.includes('projetor') ? [1,0,0] : [0,0,1]);
const projector = candidate(1,'Equipamentos',['projetor']);
describe('dynamic candidates', () => {
 it('classifies an existing candidate', async () => {
  expect((await classifyDynamic('O projetor não funciona', [projector, candidate(2,'Pessoas',['férias'])],policy,embed)).sector_id).toBe(projector.id);
 });
 it('includes a newly registered UUID without classifier changes', async () => {
  const text='Preciso solicitar minhas férias';
  expect((await classifyDynamic(text,[projector],policy,embed)).sector_id).toBeNull();
  const added=candidate(9,'Novo setor',['férias']);
  expect((await classifyDynamic(text,[projector,added],policy,embed)).sector_id).toBe(added.id);
 });
 it('uses modified categories on the next call, without stale cache', async () => {
  const sector=candidate(9,'Setor cadastrado',['projetor']);
  expect((await classifyDynamic('Preciso solicitar minhas férias',[sector],policy,embed)).sector_id).toBeNull();
  sector.categories=['férias'];
  expect((await classifyDynamic('Preciso solicitar minhas férias',[sector],policy,embed)).sector_id).toBe(sector.id);
 });
 it('uses a modified name too', async () => {
  const sector=candidate(9,'projetor',[]);
  expect((await classifyDynamic('Preciso solicitar minhas férias',[sector],policy,embed)).sector_id).toBeNull();
  sector.name='férias';
  expect((await classifyDynamic('Preciso solicitar minhas férias',[sector],policy,embed)).sector_id).toBe(sector.id);
 });
 it('abstains without evidence, on short descriptions and equal candidates', async () => {
  expect((await classifyDynamic('Receita de bolo simples',[projector],policy,embed)).automatic_sector).toBeNull();
  expect((await classifyDynamic('projetor',[projector],policy,embed)).automatic_sector).toBeNull();
  const tied=await classifyDynamic('Meu projetor está quebrado',[projector,candidate(2,'Duplicado',['projetor'])],policy,embed);
  expect(tied.automatic_sector).toBeNull(); expect(tied.classification.review_reason).toBe('close_scores');
 });
 it('raises the evidence requirement for sparse catalogs without changing the ranking', async () => {
  expect(effectiveMinimumScore(policy, 2)).toBeCloseTo(0.45);
  expect(effectiveMinimumScore(policy, 3)).toBeCloseTo(0.30);
  expect(effectiveMinimumScore(policy, 4)).toBeCloseTo(0.25);
  expect(effectiveMinimumScore(policy, 6)).toBeCloseTo(0.25);
  const sparseEmbed: Embedder = async texts => texts.map((_, index) =>
    index === 0 ? [1, 0] : index === 1 ? [0.30, Math.sqrt(1 - 0.30 ** 2)] : [0.05, Math.sqrt(1 - 0.05 ** 2)]);
  const result = await classifyDynamic('boleto mensalidade vencida', [
    candidate(1, 'Recursos Humanos', ['folha de pagamento']),
    candidate(2, 'Astronomia', ['telescópio']),
  ], policy, sparseEmbed);
  expect(result.classification.alternatives[0]?.name).toBe('Recursos Humanos');
  expect(result.automatic_sector).toBeNull();
  expect(result.classification.decision.minimum_score).toBeCloseTo(0.45);
 });
 it('rejects empty description and missing candidates', async () => {
  await expect(classifyDynamic('  ',[projector],policy,embed)).rejects.toThrow('INVALID_REQUEST');
  await expect(classifyDynamic('Meu projetor está quebrado',[],policy,embed)).rejects.toThrow('INVALID_REQUEST');
 });
});
