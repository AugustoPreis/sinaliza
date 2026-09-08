import * as ExcelJS from 'exceljs';
import { mockDeep } from 'jest-mock-extended';

import { ETicketEventType } from '@modules/tickets/enums/ticket-event-type.enum';

import { ResearchExportQueryDTO } from '../../dtos/research-export-query.dto';
import { ResearchRepository } from '../../repositories/research.repository';
import { ExportResearchDataUseCase } from '../export-research-data.use-case';

describe('ExportResearchDataUseCase', () => {
  const researchRepository = mockDeep<ResearchRepository>();
  const useCase = new ExportResearchDataUseCase(researchRepository);

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

  it('writes the exact §15.2 column header order on the data sheet', async () => {
    const { workbook } = await runAndLoad();

    const worksheet = workbook.getWorksheet('dados_pesquisa')!;
    const headerRow = worksheet.getRow(1).values as unknown[];

    expect(headerRow.slice(1)).toEqual([
      'ticket_id',
      'protocol',
      'created_at',
      'description',
      'building',
      'environment',
      'automatic_sector',
      'confirmed_sector',
      'requester_corrected',
      'sector_reclassified',
      'reclassification_count',
      'resolved_by_sector',
      'correct_sector_reached_at',
      'resolved_at',
      'time_to_correct_sector_seconds',
      'time_to_resolution_seconds',
    ]);
  });

  it('computes reclassification_count from REASSIGNED events only', async () => {
    const { workbook } = await runAndLoad();

    const worksheet = workbook.getWorksheet('dados_pesquisa')!;
    const row = worksheet.getRow(2).values as unknown[];

    expect(row[11]).toBe(1); // reclassification_count column
  });

  it('computes time_to_correct_sector_seconds and time_to_resolution_seconds from timestamps', async () => {
    const { workbook } = await runAndLoad();

    const worksheet = workbook.getWorksheet('dados_pesquisa')!;
    const row = worksheet.getRow(2).values as unknown[];

    expect(row[15]).toBe(1800);
    expect(row[16]).toBe(14400);
  });

  it('leaves the time columns null for a ticket with no timestamps yet', async () => {
    const { workbook } = await runAndLoad();

    const worksheet = workbook.getWorksheet('dados_pesquisa')!;
    const row = worksheet.getRow(3).values as unknown[];

    // ExcelJS's `Row.values` reads back an empty/null cell as `undefined`,
    // not `null` — either way it's absent from the exported spreadsheet.
    expect(row[15]).toBeFalsy();
    expect(row[16]).toBeFalsy();
  });

  it('includes a second sheet with one row per REASSIGNED event', async () => {
    const { workbook } = await runAndLoad();

    const worksheet = workbook.getWorksheet('reclassificacoes')!;

    expect(worksheet.rowCount).toBe(2); // header + 1 REASSIGNED event
    const row = worksheet.getRow(2).values as unknown[];
    expect(row.slice(1)).toEqual(['tkt_123', 'SIN-1042', 'TI', 'Manutenção Predial', 'O defeito é elétrico', correctSectorReachedAt]);
  });
});
