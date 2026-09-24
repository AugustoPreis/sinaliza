import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { AI_CONFIG } from '../config/ai.js';
import type { SectorDefinition, TicketRecord } from '../shared/types.js';

const openings = ['', 'olá, ', 'oi pessoal, ', 'bom dia, ', 'preciso de ajuda: ', 'alguém consegue verificar? ', 'estou com uma dificuldade: ', 'queria uma orientação porque ', 'por favor, ', 'desde cedo '];
const contexts = ['', ' Isso começou hoje.', ' Já tentei novamente e continua igual.', ' Estou tentando resolver pelo celular.', ' O problema acontece também no computador.', ' Preciso resolver isso ainda esta semana.', ' Antes funcionava normalmente.', ' Não encontrei uma opção para corrigir sozinho.'];
const endings = ['', ' Podem me orientar?', ' O que devo fazer?', ' Conseguem verificar para mim?', ' Aguardo uma ajuda.', ' Obrigado.'];

function withoutAccents(value: string): string { return value.normalize('NFD').replace(/\p{M}/gu, ''); }
function informal(value: string): string { return value.toLowerCase().replaceAll('não', 'nao').replaceAll('está', 'ta').replaceAll('para', 'pra').replace(/[,.?]/g, ''); }
function lightTypo(value: string): string {
  const words = value.split(' ');
  const index = words.findIndex((word) => word.length > 7);
  if (index >= 0) words[index] = `${words[index]!.slice(0, 3)}${words[index]!.slice(4)}`;
  return words.join(' ');
}
function linguisticStyle(value: string, style: number): string {
  if (style === 1) return withoutAccents(value);
  if (style === 2) return informal(value);
  if (style === 3) return lightTypo(value);
  return value;
}
function csvCell(value: string): string { return `"${value.replaceAll('"', '""')}"`; }

export function generateBalancedDataset(sectors: SectorDefinition[], size: number = AI_CONFIG.datasetSize): TicketRecord[] {
  if (sectors.length === 0) throw new Error('Informe ao menos um setor para gerar o dataset.');
  for (const sector of sectors) if (!sector.examples?.length) throw new Error(`O setor ${sector.id} não possui exemplos representativos.`);
  const base = Math.floor(size / sectors.length);
  const remainder = size % sectors.length;
  const records: TicketRecord[] = [];
  sectors.forEach((sector, sectorIndex) => {
    const target = base + (sectorIndex < remainder ? 1 : 0);
    const perExample = Math.floor(target / sector.examples.length);
    const exampleRemainder = target % sector.examples.length;
    sector.examples.forEach((example, exampleIndex) => {
      const exampleTarget = perExample + (exampleIndex < exampleRemainder ? 1 : 0);
      const seen = new Set<string>();
      let sequence = 0;
      while (seen.size < exampleTarget) {
      const block = sequence;
      const opening = openings[block % openings.length]!;
      const context = contexts[Math.floor(block / openings.length) % contexts.length]!;
      const ending = endings[Math.floor(block / (openings.length * contexts.length)) % endings.length]!;
      const style = Math.floor(block / (openings.length * contexts.length * endings.length)) % 4;
      const structure = Math.floor(block / (openings.length * contexts.length * endings.length * 4)) % 4;
      const narrative = block % 13 === 0 ? ' Tentei repetir o procedimento algumas vezes, conferi os dados informados e mesmo assim ainda não consegui concluir.' : '';
      const structures = [
        `${opening}${example}${context}${narrative}${ending}`,
        `${context} ${opening}${example}${ending}${narrative}`,
        `${example}${ending}${context}${narrative}`,
        `${opening}${context} O que acontece é o seguinte: ${example}.${narrative}${ending}`,
      ];
      const text = linguisticStyle(structures[structure]!.replace(/\s+/g, ' ').trim(), style);
      if (text) seen.add(text);
      sequence += 1;
      if (sequence > exampleTarget * 100) throw new Error(`Não foi possível gerar variedade suficiente para o exemplo ${exampleIndex + 1} do setor ${sector.id}.`);
      }
      const sourceExampleId = `${sector.id}:example-${exampleIndex + 1}`;
      records.push(...[...seen].map((originalText) => ({ originalText, sectorId: sector.id, sourceExampleId, groupId: sourceExampleId })));
    });
  });
  return records;
}

export async function writeDataset(path: string, records: TicketRecord[]): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const csv = `text,sector_id,source_example_id,group_id\n${records.map((item) => `${csvCell(item.originalText)},${csvCell(item.sectorId)},${csvCell(item.sourceExampleId)},${csvCell(item.groupId)}`).join('\n')}\n`;
  await writeFile(path, csv, 'utf8');
}
