import * as ExcelJS from 'exceljs';
import { mockDeep } from 'jest-mock-extended';
import { I18nService } from 'nestjs-i18n';

import { ETicketEventType } from '@modules/tickets/enums/ticket-event-type.enum';

import { ResearchExportQueryDTO } from '../../dtos/research-export-query.dto';
import { ResearchRepository } from '../../repositories/research.repository';
import { ExportResearchDataUseCase } from '../export-research-data.use-case';

// Mirrors `research.json`'s `export.*` keys so the header-order test below
// exercises the same lookup the real i18n loader performs, without pulling
// in the real nestjs-i18n runtime.
const TRANSLATIONS: Record<string, string> = {
  'research.export.dataSheet.protocol': 'Protocolo',
  'research.export.dataSheet.createdAt': 'Criado em',
  'research.export.dataSheet.description': 'Descrição',
  'research.export.dataSheet.building': 'Prédio',
  'research.export.dataSheet.environment': 'Ambiente',
  'research.export.dataSheet.automaticSector': 'Setor automático',
  'research.export.dataSheet.confirmedSector': 'Setor confirmado',
  'research.export.dataSheet.requesterCorrected': 'Solicitante corrigiu o setor',
  'research.export.dataSheet.sectorReclassified': 'Setor foi reclassificado',
  'research.export.dataSheet.reclassificationCount': 'Quantidade de reclassificações',
  'research.export.dataSheet.resolvedBySector': 'Resolvido pelo setor',
  'research.export.dataSheet.correctSectorReachedAt': 'Setor correto alcançado em',
  'research.export.dataSheet.resolvedAt': 'Resolvido em',
  'research.export.dataSheet.timeToCorrectSector': 'Tempo até o setor correto',
  'research.export.dataSheet.timeToResolution': 'Tempo até a resolução',
  'research.export.reclassificationsSheet.protocol': 'Protocolo',
  'research.export.reclassificationsSheet.fromSector': 'Setor de origem',
  'research.export.reclassificationsSheet.toSector': 'Setor de destino',
  'research.export.reclassificationsSheet.reason': 'Motivo',
  'research.export.reclassificationsSheet.createdAt': 'Data',
};

describe('ExportResearchDataUseCase', () => {
  const researchRepository = mockDeep<ResearchRepository>();
  const i18n = {
    translate: jest.fn((key: string) => TRANSLATIONS[key] ?? key),
  } as unknown as jest.Mocked<I18nService>;
  const useCase = new ExportResearchDataUseCase(researchRepository, i18n);

  const createdAt = new Date('2026-08-20T14:30:00Z');
  const correctSectorReachedAt = new Date('2026-08-20T15:00:00Z'); // +1800s
  const resolvedAt = new Date('2026-08-20T18:30:00Z'); // +14400s

  const resolvedTicket = {
    uuid: 'tkt_123',
    protocol: 'SIN-1042',
    createdAt,
    description: 'O projetor da sala não está ligando',
    building: { name: 'Bloco A' },
    environment: { name: 'Sala 101' },
    automaticSector: { name: 'TI' },
    confirmedSector: { name: 'Manutenção Predial' },
    resolvedBySector: { name: 'Manutenção Predial' },
    requesterCorrected: true,
    sectorReclassified: true,
    correctSectorReachedAt,
    resolvedAt,
    events: [
      {
        type: ETicketEventType.TICKET_OPENED,
        fromSector: null,
        toSector: null,
        reason: null,
        createdAt,
      },
      {
        type: ETicketEventType.REASSIGNED,
        fromSector: { name: 'TI' },
        toSector: { name: 'Manutenção Predial' },
        reason: 'O defeito é elétrico',
        createdAt: correctSectorReachedAt,
      },
    ],
  } as never;

  const openTicket = {
    uuid: 'tkt_456',
    protocol: 'SIN-1043',
    createdAt,
    description: 'Vazamento no corredor',
    building: null,
    environment: null,
    automaticSector: { name: 'Manutenção Predial' },
    confirmedSector: { name: 'Manutenção Predial' },
    resolvedBySector: null,
    requesterCorrected: false,
    sectorReclassified: false,
    correctSectorReachedAt: null,
    resolvedAt: null,
    events: [],
  } as never;

  beforeEach(() => {
    jest.clearAllMocks();
    researchRepository.findForExport.mockResolvedValue([resolvedTicket, openTicket]);
  });

  async function runAndLoad(
    query = new ResearchExportQueryDTO(),
  ): Promise<{ result: Awaited<ReturnType<typeof useCase.execute>>; workbook: ExcelJS.Workbook }> {
    const result = await useCase.execute(query);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(result.buffer as unknown as ExcelJS.Buffer);

    return { result, workbook };
  }

  it('returns an xlsx buffer', async () => {
    const { result } = await runAndLoad();

    expect(result.buffer).toBeInstanceOf(Buffer);
  });

  it('names the file after the "to" filter year-month when given', async () => {
    const { result } = await runAndLoad(
      Object.assign(new ResearchExportQueryDTO(), { to: new Date('2026-08-31T00:00:00Z') }),
    );

    expect(result.filename).toBe('sinaliza_pesquisa_2026-08.xlsx');
  });

  it('writes Portuguese column headers on the data sheet, with no internal ticket id', async () => {
    const { workbook } = await runAndLoad();

    const worksheet = workbook.getWorksheet('dados_pesquisa')!;
    const headerRow = worksheet.getRow(1).values as unknown[];

    expect(headerRow.slice(1)).toEqual([
      'Protocolo',
      'Criado em',
      'Descrição',
      'Prédio',
      'Ambiente',
      'Setor automático',
      'Setor confirmado',
      'Solicitante corrigiu o setor',
      'Setor foi reclassificado',
      'Quantidade de reclassificações',
      'Resolvido pelo setor',
      'Setor correto alcançado em',
      'Resolvido em',
      'Tempo até o setor correto',
      'Tempo até a resolução',
    ]);
  });

  it('computes reclassification_count from REASSIGNED events only', async () => {
    const { workbook } = await runAndLoad();

    const worksheet = workbook.getWorksheet('dados_pesquisa')!;
    const row = worksheet.getRow(2).values as unknown[];

    expect(row[10]).toBe(1); // "Quantidade de reclassificações" column
  });

  it('formats the elapsed-time columns as HH:mm', async () => {
    const { workbook } = await runAndLoad();

    const worksheet = workbook.getWorksheet('dados_pesquisa')!;
    const row = worksheet.getRow(2).values as unknown[];

    expect(row[14]).toBe('00:30'); // 1800s until the correct sector
    expect(row[15]).toBe('04:00'); // 14400s until resolution
  });

  it('leaves the time columns null for a ticket with no timestamps yet', async () => {
    const { workbook } = await runAndLoad();

    const worksheet = workbook.getWorksheet('dados_pesquisa')!;
    const row = worksheet.getRow(3).values as unknown[];

    // ExcelJS's `Row.values` reads back an empty/null cell as `undefined`,
    // not `null` - either way it's absent from the exported spreadsheet.
    expect(row[14]).toBeFalsy();
    expect(row[15]).toBeFalsy();
  });

  it('includes a second sheet with one row per REASSIGNED event, with no internal ticket id', async () => {
    const { workbook } = await runAndLoad();

    const worksheet = workbook.getWorksheet('reclassificacoes')!;

    expect(worksheet.rowCount).toBe(2); // header + 1 REASSIGNED event
    const row = worksheet.getRow(2).values as unknown[];
    expect(row.slice(1)).toEqual([
      'SIN-1042',
      'TI',
      'Manutenção Predial',
      'O defeito é elétrico',
      correctSectorReachedAt,
    ]);
  });
});
