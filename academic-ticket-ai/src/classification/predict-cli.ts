import { ManualSession, resolveManualSector } from './manual-session.js';
import { defaultModel } from '../models/default.js';
import { readFile } from 'node:fs/promises';
import { createInterface } from 'node:readline/promises';
import { loadTfidfModel, predictWithTfidf } from '../tfidf/model.js';
import { loadMinilmModel, predictWithMinilm } from '../minilm/model.js';
import { assertModelDataSourceAllowed } from '../config/runtime.js';

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const flag = args.indexOf('--model');
  let path: string;
  if (flag >= 0) {
    const supplied = args.splice(flag, 2)[1];
    if (!supplied) throw new Error('Informe o arquivo após --model.');
    path = supplied;
  } else {
    path = (await defaultModel()).modelPath;
  }
  const raw = JSON.parse(await readFile(path, 'utf8')) as { modelName?: string };
  const artifact = raw.modelName === 'minilm-rf' ? await loadMinilmModel(path) : await loadTfidfModel(path);
  // Explicit local command opts into MOCK only outside production; service remains disabled by default.
  assertModelDataSourceAllowed(artifact.metadata.dataSource, artifact.metadata.dataSource === 'MOCK' ? 'mock' : 'trained');
  const session = new ManualSession();
  const sectors = artifact.metadata.sectorIds;
  const interactive = args.length === 0;
  const predict = async (description: string) => {
    if (!description.trim() || description.length > 2000) throw new Error('Informe de 1 a 2.000 caracteres.');
    const result = 'vectorizer' in artifact ? await predictWithTfidf(artifact, description) : await predictWithMinilm(artifact, description);
    if (!interactive) {
      console.log(JSON.stringify({ sector_id: result.sectorId, confidence: result.confidence, model: result.model, dataSource: artifact.metadata.dataSource,
        requires_review: result.requiresReview, review_reason: result.reviewReason, alternatives: result.alternatives }, null, 2));
      return;
    }
    session.addPrediction(result.sectorId, result.requiresReview);
    if (result.requiresReview) {
      console.log(`\nPossível setor: ${result.sectorId}. Descreva melhor o problema para confirmar.`);
    } else {
      console.log(`\nEncaminhar para ${result.sectorId}.`);
    }
  };
  if (args.length) { await predict(args.join(' ')); return; }
  const help = () => console.log('Digite um chamado. Comandos: /setores, /ok, /corrigir <número ou nome>, /resultado, /ajuda, /sair.\nAs avaliações ficam apenas nesta sessão; não alteram o treino nem salvam suas descrições.');
  const summary = () => {
    const result = session.summary();
    console.log(`Avaliação manual: ${result.correct}/${result.evaluated} sugestões corretas${result.accuracy === null ? '' : ` (${(result.accuracy * 100).toFixed(1)}%)`}. ${result.incorrect} erros, ${result.pending} sem avaliação. ${result.requiresReview} pedidos de contexto.`);
  };
  console.log('Sinaliza — digite um chamado. /ajuda para comandos · /sair para encerrar.');
  const terminal = createInterface({ input: process.stdin, output: process.stdout });
  terminal.setPrompt('Chamado > ');
  terminal.prompt();
  try {
    for await (const line of terminal) {
      const command = line.trim();
      if (command === '/sair') break;
      try {
        if (!command) { /* Ignore blank input. */ }
        else if (command === '/ajuda') help();
        else if (command === '/setores') console.log(sectors.map((sector, index) => `${index + 1}. ${sector}`).join('\n'));
        else if (command === '/resultado') summary();
        else if (command === '/ok') { session.markExpected(session.lastPrediction()); summary(); }
        else if (command.startsWith('/corrigir ')) { session.markExpected(resolveManualSector(command.slice(10), sectors)); summary(); }
        else if (command.startsWith('/')) throw new Error('Comando desconhecido. Use /ajuda.');
        else await predict(line);
      } catch (error) { console.error(error instanceof Error ? error.message : error); }
      terminal.prompt();
    }
  } finally { if (session.summary().evaluated > 0) summary(); terminal.close(); }
}
main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
