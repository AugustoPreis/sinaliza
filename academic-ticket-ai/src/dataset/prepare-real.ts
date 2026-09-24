import { prepareRealDataset } from './real-data.js';
import { AI_CONFIG } from '../config/ai.js';
import { FileSectorProvider } from '../sectors/provider.js';

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const outputIndex = args.indexOf('--output');
  const output = outputIndex >= 0 ? args.splice(outputIndex, 2)[1] : undefined;
  const sectorsIndex = args.indexOf('--sectors');
  const sectorsPath = sectorsIndex >= 0 ? args.splice(sectorsIndex, 2)[1] : AI_CONFIG.mockSectorConfigPath;
  const input = args[0];
  if (!input) throw new Error('Uso: npm run dataset:prepare -- /caminho/exportacao.csv [--output data/private/chamados-reais.csv]');
  const sectors = await new FileSectorProvider(sectorsPath!).getActiveSectors();
  const report = await prepareRealDataset(input, sectors, output);
  console.log('Dataset privado preparado sem exibir o conteúdo dos chamados.');
  console.table(Object.entries(report.distribution).map(([setor, quantidade]) => ({ setor, quantidade })));
  console.log(`Linhas recebidas: ${report.inputRows}; salvas: ${report.outputRows}; duplicadas removidas: ${report.removedDuplicates}.`);
  console.log(`Redações automáticas: ${JSON.stringify(report.redactions)}.`);
  for (const warning of report.warnings) console.warn(`ATENÇÃO: ${warning}`);
}

main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
