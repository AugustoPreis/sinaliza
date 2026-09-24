import { writeJson } from '../shared/utils.js';
import { FileSectorProvider } from '../sectors/provider.js';
import { AI_CONFIG } from '../config/ai.js';
import { normalizeText } from '../preprocessing/normalize.js';

const topicWords: Record<string, string[]> = {
  TI: ['acesso','login','senha','internet','rede','sistema','portal','aplicativo','computador','impressora','arquivo','autenticacao','wifi','vpn','erro','instalar'],
  'Secretaria Acadêmica': ['matricula','disciplina','historico','diploma','curso','nota','frequencia','documento','rematricula','formatura','transferencia','cadastro'],
  Financeiro: ['boleto','mensalidade','pagamento','cobranca','parcela','bolsa','desconto','juros','fatura','pix','divida','contrato','estorno','valor','taxa'],
  Biblioteca: ['livro','obra','acervo','emprestimo','devolucao','reserva','artigo','tese','revista','catalogo','exemplar','multa','periodico','biblioteca','sala','ebook','material'],
};
const stop = new Set(['nao','consigo','preciso','quero','minha','meu','uma','um','para','como','que','da','do','de','o','a','e','no','na','está','estou','com']);
const tokens = (s: string) => new Set(normalizeText(s).split(/\s+/).filter((x) => x.length > 2 && !stop.has(x)));
function jaccard(a: Set<string>, b: Set<string>): number { const inter = [...a].filter((x) => b.has(x)).length; return inter / Math.max(1, new Set([...a, ...b]).size); }

const sectors = await new FileSectorProvider(AI_CONFIG.mockSectorConfigPath).getActiveSectors();
const perSector = sectors.map((sector) => {
  const rows = sector.examples.map((example, index) => {
    const t = tokens(example); const coverage = Object.fromEntries(Object.entries(topicWords).map(([k, words]) => [k, words.filter((w) => t.has(w)).length]));
    const own = coverage[sector.id] ?? 0; const otherMax = Math.max(...Object.entries(coverage).filter(([k]) => k !== sector.id).map(([,v]) => v as number), 0);
    const clarity = own >= 2 ? 'claro' : own === 1 ? 'ambiguo' : 'generico';
    return { index: index + 1, example, classification: clarity, potentiallyConflicting: otherMax >= own && otherMax > 0, topics: Object.entries(coverage).filter(([,v]) => (v as number) > 0).map(([k]) => k) };
  });
  const counts = { claros: rows.filter((r) => r.classification === 'claro').length, ambiguos: rows.filter((r) => r.classification === 'ambiguo').length, genericos: rows.filter((r) => r.classification === 'generico').length, conflicting: rows.filter((r) => r.potentiallyConflicting).length };
  const topicCounts = Object.fromEntries((topicWords[sector.id] ?? []).map((word) => [word, rows.filter((r) => tokens(r.example).has(word)).length]));
  return { sector: sector.id, total: rows.length, counts, topicCounts, examples: rows };
});
const all = sectors.flatMap((s) => s.examples.map((example, i) => ({ sector: s.id, index: i + 1, example, tokens: tokens(example) })));
const redundant: unknown[] = [];
for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) { const score = jaccard(all[i]!.tokens, all[j]!.tokens); if (score >= 0.6) redundant.push({ left: all[i], right: all[j], similarity: Number(score.toFixed(3)), sameSector: all[i]!.sector === all[j]!.sector }); }
const report = { generatedAt: new Date().toISOString(), sectors: perSector, redundantSuspects: redundant };
await writeJson('reports/example-audit.json', report);
console.log(JSON.stringify({ sectors: perSector.map(({ sector, total, counts }) => ({ sector, total, ...counts })), redundantSuspects: redundant.length }), null, 2);
