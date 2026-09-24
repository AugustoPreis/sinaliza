import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';

import { TicketEntity } from '@modules/tickets/entities/ticket.entity';
import { ETicketEventType } from '@modules/tickets/enums/ticket-event-type.enum';

// Period filters by `ticket.createdAt`; `sectorId`/`buildingId` scope the
// same way as `GetAdminDashboardUseCase`'s `IDashboardFilters`: `sectorId`
// against `currentSectorId` (setor "responsável atualmente"), `buildingId`
// against the ticket's own building.
export interface IResearchFilters {
  from?: Date;
  to?: Date;
  sectorId?: number;
  buildingId?: number;
}

export interface IResearchExportFilters {
  from?: Date;
  to?: Date;
}

export interface IResearchCountRow {
  key: number;
  count: number;
}

export interface IResearchIndicatorsData {
  totalTickets: number;
  // `automaticSectorId == resolvedBySectorId`, which is NULL for unresolved
  // tickets, so those never match - no extra "status = RESOLVED" filter needed.
  correctWithoutAnyCorrection: number;
  correctionsByRequester: number;
  // At least one `REASSIGNED` timeline event.
  correctionsBySector: number;
  // Raw `(correctSectorReachedAt - createdAt)` samples in minutes, returned
  // flat (not pre-aggregated) so the use-case can sort in memory for the
  // median - Postgres has no built-in MEDIAN aggregate.
  correctSectorMinutes: number[];
  volumeBySector: IResearchCountRow[];
  // Grouped by `automaticSectorId`; see `GetResearchIndicatorsUseCase` for how
  // a category label is derived from a sector (`Ticket` has no `category` column).
  volumeByAutomaticSector: IResearchCountRow[];
  volumeByLocation: IResearchCountRow[];
}

@Injectable()
export class ResearchRepository {
  constructor(
    @InjectRepository(TicketEntity)
    private readonly ticketRepo: Repository<TicketEntity>,
  ) {}

  async getIndicatorsData(filters: IResearchFilters): Promise<IResearchIndicatorsData> {
    const baseQb = (): SelectQueryBuilder<TicketEntity> => {
      const qb = this.ticketRepo.createQueryBuilder('ticket').where('ticket.deletedAt IS NULL');

      if (filters.from) {
        qb.andWhere('ticket.createdAt >= :from', { from: filters.from });
      }

      if (filters.to) {
        qb.andWhere('ticket.createdAt <= :to', { to: filters.to });
      }

      if (filters.sectorId) {
        qb.andWhere('ticket.currentSectorId = :sectorId', { sectorId: filters.sectorId });
      }

      if (filters.buildingId) {
        qb.andWhere('ticket.buildingId = :buildingId', { buildingId: filters.buildingId });
      }

      return qb;
    };

    const totalTickets = await baseQb().getCount();

    const correctWithoutAnyCorrection = await baseQb()
      .andWhere('ticket.automaticSectorId = ticket.resolvedBySectorId')
      .andWhere('ticket.requesterCorrected = false')
      .andWhere('ticket.sectorReclassified = false')
      .getCount();

    const correctionsByRequester = await baseQb()
      .andWhere('ticket.automaticSectorId != ticket.confirmedSectorId')
      .getCount();

    const correctionsBySectorRow = await baseQb()
      .innerJoin('ticket.events', 'event', 'event.type = :reassigned', {
        reassigned: ETicketEventType.REASSIGNED,
      })
      .select('COUNT(DISTINCT ticket.id)', 'count')
      .getRawOne<{ count: string }>();

    const timeRows = await baseQb()
      .andWhere('ticket.correctSectorReachedAt IS NOT NULL')
      .select(
        'EXTRACT(EPOCH FROM (ticket.correctSectorReachedAt - ticket.createdAt)) / 60',
        'minutes',
      )
      .getRawMany<{ minutes: string }>();

    const bySectorRows = await baseQb()
      .select('ticket.currentSectorId', 'key')
      .addSelect('COUNT(*)', 'count')
      .groupBy('ticket.currentSectorId')
      .getRawMany<{ key: string; count: string }>();

    const byAutomaticSectorRows = await baseQb()
      .select('ticket.automaticSectorId', 'key')
      .addSelect('COUNT(*)', 'count')
      .groupBy('ticket.automaticSectorId')
      .getRawMany<{ key: string; count: string }>();

    const byBuildingRows = await baseQb()
      .select('ticket.buildingId', 'key')
      .addSelect('COUNT(*)', 'count')
      .groupBy('ticket.buildingId')
      .getRawMany<{ key: string; count: string }>();

    return {
      totalTickets,
      correctWithoutAnyCorrection,
      correctionsByRequester,
      correctionsBySector: Number(correctionsBySectorRow?.count ?? 0),
      correctSectorMinutes: timeRows.map((row) => Number(row.minutes)),
      volumeBySector: mapCountRows(bySectorRows),
      volumeByAutomaticSector: mapCountRows(byAutomaticSectorRows),
      volumeByLocation: mapCountRows(byBuildingRows),
    };
  }

  // `events` is loaded in full (not just `REASSIGNED`) so
  // `ExportResearchDataUseCase` can count reclassifications and build the
  // second sheet from this same query.
  findForExport(filters: IResearchExportFilters): Promise<TicketEntity[]> {
    const qb = this.ticketRepo
      .createQueryBuilder('ticket')
      .leftJoinAndSelect('ticket.building', 'building')
      .leftJoinAndSelect('ticket.environment', 'environment')
      .leftJoinAndSelect('ticket.automaticSector', 'automaticSector')
      .leftJoinAndSelect('ticket.confirmedSector', 'confirmedSector')
      .leftJoinAndSelect('ticket.resolvedBySector', 'resolvedBySector')
      .leftJoinAndSelect('ticket.events', 'event')
      .where('ticket.deletedAt IS NULL');

    if (filters.from) {
      qb.andWhere('ticket.createdAt >= :from', { from: filters.from });
    }

    if (filters.to) {
      qb.andWhere('ticket.createdAt <= :to', { to: filters.to });
    }

    qb.orderBy('ticket.createdAt', 'ASC');

    return qb.getMany();
  }
}

function mapCountRows(rows: Array<{ key: string; count: string }>): IResearchCountRow[] {
  return rows.map((row) => ({ key: Number(row.key), count: Number(row.count) }));
}
