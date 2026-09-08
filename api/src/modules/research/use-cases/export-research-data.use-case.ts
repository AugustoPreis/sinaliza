import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';

import { TicketEntity } from '@modules/tickets/entities/ticket.entity';
import { ETicketEventType } from '@modules/tickets/enums/ticket-event-type.enum';

import { ResearchExportQueryDTO } from '../dtos/research-export-query.dto';
import { IResearchExportFilters, ResearchRepository } from '../repositories/research.repository';

export interface IResearchExportResult {
  buffer: Buffer;
  filename: string;
}

const DATA_SHEET_NAME = 'dados_pesquisa';
const RECLASSIFICATIONS_SHEET_NAME = 'reclassificacoes';

// endpoints-sinaliza.md §15.2 exact column list, in order.
const DATA_COLUMNS = [
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
] as const;

// §15.2 "também pode incluir os eventos de reclassificação em uma
// aba/tabela separada" — included, since `findForExport` already loads
// every `TicketEventEntity` per ticket and filtering/mapping them is cheap.
const RECLASSIFICATION_COLUMNS = [
  'ticket_id',
  'protocol',
  'from_sector',
  'to_sector',
  'reason',
  'created_at',
] as const;

// `GET /admin/research/export` (endpoints-sinaliza.md §15.2).
@Injectable()
export class ExportResearchDataUseCase {
  constructor(private readonly researchRepository: ResearchRepository) {}

  async execute(query: ResearchExportQueryDTO): Promise<IResearchExportResult> {
    const filters: IResearchExportFilters = { from: query.from, to: query.to };
    const tickets = await this.researchRepository.findForExport(filters);

    const workbook = new ExcelJS.Workbook();

    this.buildDataSheet(workbook, tickets);
    this.buildReclassificationsSheet(workbook, tickets);

    const buffer = await workbook.xlsx.writeBuffer();

    return { buffer: Buffer.from(buffer), filename: buildFilename(query) };
  }

  private buildDataSheet(workbook: ExcelJS.Workbook, tickets: TicketEntity[]): void {
    const worksheet = workbook.addWorksheet(DATA_SHEET_NAME);

    worksheet.columns = DATA_COLUMNS.map((header) => ({ header, key: header, width: 24 }));

    for (const ticket of tickets) {
      const reclassificationCount = reassignedEvents(ticket).length;

      worksheet.addRow({
        ticket_id: ticket.uuid,
        protocol: ticket.protocol,
        created_at: ticket.createdAt,
        description: ticket.description,
        building: ticket.building?.name ?? null,
        environment: ticket.environment?.name ?? null,
        automatic_sector: ticket.automaticSector?.name ?? null,
        confirmed_sector: ticket.confirmedSector?.name ?? null,
        requester_corrected: ticket.requesterCorrected,
        sector_reclassified: ticket.sectorReclassified,
        reclassification_count: reclassificationCount,
        resolved_by_sector: ticket.resolvedBySector?.name ?? null,
        correct_sector_reached_at: ticket.correctSectorReachedAt,
        resolved_at: ticket.resolvedAt,
        time_to_correct_sector_seconds: diffSeconds(ticket.createdAt, ticket.correctSectorReachedAt),
        time_to_resolution_seconds: diffSeconds(ticket.createdAt, ticket.resolvedAt),
      });
    }
  }

  private buildReclassificationsSheet(workbook: ExcelJS.Workbook, tickets: TicketEntity[]): void {
    const worksheet = workbook.addWorksheet(RECLASSIFICATIONS_SHEET_NAME);

    worksheet.columns = RECLASSIFICATION_COLUMNS.map((header) => ({
      header,
      key: header,
      width: 24,
    }));

    for (const ticket of tickets) {
      for (const event of reassignedEvents(ticket)) {
        worksheet.addRow({
          ticket_id: ticket.uuid,
          protocol: ticket.protocol,
          from_sector: event.fromSector?.name ?? null,
          to_sector: event.toSector?.name ?? null,
          reason: event.reason,
          created_at: event.createdAt,
        });
      }
    }
  }
}

function reassignedEvents(ticket: TicketEntity): TicketEntity['events'] {
  return (ticket.events ?? []).filter((event) => event.type === ETicketEventType.REASSIGNED);
}

function diffSeconds(start: Date, end: Date | null): number | null {
  if (!end) return null;

  return Math.round((end.getTime() - start.getTime()) / 1000);
}

// The doc's example filename is a single month ("sinaliza_pesquisa_2026-08.xlsx").
// An export can span an arbitrary `from`/`to` range (or none at all), so
// there isn't always one unambiguous month to name the file after. Decision:
// use `to` when given (the range's most recent boundary), else `from`, else
// the current date — always formatted as `AAAA-MM`, matching the doc's
// example shape even though the underlying data may cover a wider period.
function buildFilename(query: ResearchExportQueryDTO): string {
  const reference = query.to ?? query.from ?? new Date();
  const yearMonth = `${reference.getUTCFullYear()}-${String(reference.getUTCMonth() + 1).padStart(2, '0')}`;

  return `sinaliza_pesquisa_${yearMonth}.xlsx`;
}
