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

// `key` is the internal row field name (used when building each row below);
// `header` is what the end user actually sees in the spreadsheet - no
// internal identifiers (`ticket_id`, the ticket's UUID) and no English.
const DATA_COLUMNS = [
  { key: 'protocol', header: 'Protocolo' },
  { key: 'created_at', header: 'Criado em' },
  { key: 'description', header: 'Descrição' },
  { key: 'building', header: 'Prédio' },
  { key: 'environment', header: 'Ambiente' },
  { key: 'automatic_sector', header: 'Setor automático' },
  { key: 'confirmed_sector', header: 'Setor confirmado' },
  { key: 'requester_corrected', header: 'Solicitante corrigiu o setor' },
  { key: 'sector_reclassified', header: 'Setor foi reclassificado' },
  { key: 'reclassification_count', header: 'Quantidade de reclassificações' },
  { key: 'resolved_by_sector', header: 'Resolvido pelo setor' },
  { key: 'correct_sector_reached_at', header: 'Setor correto alcançado em' },
  { key: 'resolved_at', header: 'Resolvido em' },
  { key: 'time_to_correct_sector', header: 'Tempo até o setor correto (HH:mm)' },
  { key: 'time_to_resolution', header: 'Tempo até a resolução (HH:mm)' },
] as const;

const RECLASSIFICATION_COLUMNS = [
  { key: 'protocol', header: 'Protocolo' },
  { key: 'from_sector', header: 'Setor de origem' },
  { key: 'to_sector', header: 'Setor de destino' },
  { key: 'reason', header: 'Motivo' },
  { key: 'created_at', header: 'Data' },
] as const;

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

    worksheet.columns = DATA_COLUMNS.map(({ key, header }) => ({ header, key, width: 24 }));

    for (const ticket of tickets) {
      const reclassificationCount = reassignedEvents(ticket).length;

      worksheet.addRow({
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
        time_to_correct_sector: formatDurationHHmm(
          diffSeconds(ticket.createdAt, ticket.correctSectorReachedAt),
        ),
        time_to_resolution: formatDurationHHmm(diffSeconds(ticket.createdAt, ticket.resolvedAt)),
      });
    }
  }

  private buildReclassificationsSheet(workbook: ExcelJS.Workbook, tickets: TicketEntity[]): void {
    const worksheet = workbook.addWorksheet(RECLASSIFICATIONS_SHEET_NAME);

    worksheet.columns = RECLASSIFICATION_COLUMNS.map(({ key, header }) => ({
      header,
      key,
      width: 24,
    }));

    for (const ticket of tickets) {
      for (const event of reassignedEvents(ticket)) {
        worksheet.addRow({
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

// Elapsed duration, not a time of day - hours aren't capped at 24 (a ticket
// open for a day and a half reads "36:15", not "12:15").
function formatDurationHHmm(totalSeconds: number | null): string | null {
  if (totalSeconds === null) return null;

  const totalMinutes = Math.round(totalSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

// An export can span an arbitrary `from`/`to` range (or none at all), so
// there isn't always one unambiguous month to name the file after: use `to`
// when given, else `from`, else the current date.
function buildFilename(query: ResearchExportQueryDTO): string {
  const reference = query.to ?? query.from ?? new Date();
  const yearMonth = `${reference.getUTCFullYear()}-${String(reference.getUTCMonth() + 1).padStart(2, '0')}`;

  return `sinaliza_pesquisa_${yearMonth}.xlsx`;
}
