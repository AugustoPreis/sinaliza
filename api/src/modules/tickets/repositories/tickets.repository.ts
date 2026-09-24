import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, IsNull, Repository, SelectQueryBuilder } from 'typeorm';

import { IPaginatedResult } from '@shared/interfaces';
import { assignDefined } from '@shared/utils/object.util';
import { buildPaginatedResult, buildSkip } from '@shared/utils/pagination.util';

import { TicketEventEntity } from '../entities/ticket-event.entity';
import { TicketPhotoEntity } from '../entities/ticket-photo.entity';
import { TicketEntity } from '../entities/ticket.entity';
import { ETicketStatus } from '../enums/ticket-status.enum';

// Everything the detail view (`GetTicketUseCase`) and the timeline
// description builder (`TicketDetailResponseDTO`) need loaded up front.
const TICKET_DETAIL_RELATIONS = {
  requester: true,
  building: true,
  environment: true,
  automaticSector: true,
  confirmedSector: true,
  currentSector: true,
  resolvedBySector: true,
  photos: true,
  events: { fromSector: true, toSector: true },
} as const;

export interface ITicketListFilters {
  statuses?: ETicketStatus[];
  resolved?: boolean;
}

// Shared by `findManyForQueue`'s two callers (sector queue and admin
// listing) - same shape, different DTO mapping and `sectorIds` scoping.
export interface ITicketQueueFilters {
  statuses?: ETicketStatus[];
  from?: Date;
  to?: Date;
  buildingId?: number;
  search?: string;
}

export interface IDashboardFilters {
  sectorId?: number;
  statuses?: ETicketStatus[];
  from?: Date;
  to?: Date;
  buildingId?: number;
  search?: string;
}

export interface IDashboardBySectorRow {
  sectorId: number;
  forwarded: number;
  inProgress: number;
  resolved: number;
}

export interface IDashboardAggregates {
  volume: number;
  resolvedCount: number;
  averageCorrectSectorMinutes: number | null;
  bySector: IDashboardBySectorRow[];
}

@Injectable()
export class TicketsRepository {
  constructor(
    @InjectRepository(TicketEntity)
    private readonly repo: Repository<TicketEntity>,
    @InjectRepository(TicketPhotoEntity)
    private readonly photoRepo: Repository<TicketPhotoEntity>,
    @InjectRepository(TicketEventEntity)
    private readonly eventRepo: Repository<TicketEventEntity>,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  // `n` comes from a dedicated Postgres sequence so protocol numbers never
  // collide, even under concurrent ticket creation.
  async nextProtocol(): Promise<string> {
    const [{ nextval }] = await this.dataSource.query<[{ nextval: string }]>(
      `SELECT nextval('ticket_protocol_seq') AS nextval`,
    );

    return `SIN-${nextval}`;
  }

  // Ticket + photos + initial timeline events in one transaction - either
  // all three are persisted, or none are.
  async createWithInitialEvents(
    ticketData: Partial<TicketEntity>,
    photosData: Array<Partial<TicketPhotoEntity>>,
    eventsData: Array<Partial<TicketEventEntity>>,
  ): Promise<TicketEntity> {
    const ticketUuid = await this.dataSource.transaction(async (manager) => {
      const ticketRepo = manager.getRepository(TicketEntity);
      const ticket = await ticketRepo.save(ticketRepo.create(ticketData));

      const photoRepo = manager.getRepository(TicketPhotoEntity);
      if (photosData.length) {
        await photoRepo.save(
          photosData.map((photo) => photoRepo.create({ ...photo, ticketId: ticket.id })),
        );
      }

      const eventRepo = manager.getRepository(TicketEventEntity);
      await eventRepo.save(
        eventsData.map((event) => eventRepo.create({ ...event, ticketId: ticket.id })),
      );

      return ticket.uuid;
    });

    return this.findByUuidWithRelations(ticketUuid) as Promise<TicketEntity>;
  }

  findByUuid(uuid: string): Promise<TicketEntity | null> {
    return this.repo.findOne({ where: { uuid, deletedAt: IsNull() } });
  }

  findByUuidWithRelations(uuid: string): Promise<TicketEntity | null> {
    return this.repo.findOne({
      where: { uuid, deletedAt: IsNull() },
      relations: TICKET_DETAIL_RELATIONS,
      order: { events: { createdAt: 'ASC' } },
    });
  }

  async findManyForRequester(
    requesterId: number,
    filters: ITicketListFilters,
    page: number,
    perPage: number,
  ): Promise<IPaginatedResult<TicketEntity>> {
    const where: Record<string, unknown> = { requesterId, deletedAt: IsNull() };

    if (filters.statuses?.length) {
      where.status = In(filters.statuses);
    }

    if (filters.resolved !== undefined) {
      where.status = filters.resolved ? ETicketStatus.RESOLVED : In(this.unresolvedStatuses());
    }

    const [data, total] = await this.repo.findAndCount({
      where,
      relations: { currentSector: true },
      order: { createdAt: 'DESC' },
      skip: buildSkip(page, perPage),
      take: perPage,
    });

    return buildPaginatedResult(data, total, page, perPage);
  }

  // True when the ticket is currently assigned to one of these sectors, or a
  // timeline event once forwarded it to one of them.
  ticketBelongsToSectors(ticket: TicketEntity, sectorIds: number[]): boolean {
    if (!sectorIds.length) return false;

    const sectorIdSet = new Set(sectorIds);

    if (sectorIdSet.has(ticket.currentSectorId)) return true;
    if (sectorIdSet.has(ticket.confirmedSectorId)) return true;
    if (sectorIdSet.has(ticket.automaticSectorId)) return true;

    return (ticket.events ?? []).some(
      (event) => event.toSectorId !== null && sectorIdSet.has(event.toSectorId),
    );
  }

  // `sectorIds === null` means "no sector restriction" (admin browsing every
  // queue); `[]` means "the caller has no sectors at all", which must return
  // zero rows rather than "no filter".
  async findManyForQueue(
    sectorIds: number[] | null,
    filters: ITicketQueueFilters,
    order: 'ASC' | 'DESC',
    page: number,
    perPage: number,
  ): Promise<IPaginatedResult<TicketEntity>> {
    const qb = this.repo
      .createQueryBuilder('ticket')
      .leftJoinAndSelect('ticket.building', 'building')
      .leftJoinAndSelect('ticket.environment', 'environment')
      .leftJoinAndSelect('ticket.automaticSector', 'automaticSector')
      .leftJoinAndSelect('ticket.confirmedSector', 'confirmedSector')
      .leftJoinAndSelect('ticket.currentSector', 'currentSector')
      .where('ticket.deletedAt IS NULL');

    if (sectorIds !== null) {
      if (!sectorIds.length) {
        qb.andWhere('1 = 0');
      } else {
        qb.andWhere('ticket.currentSectorId IN (:...sectorIds)', { sectorIds });
      }
    }

    if (filters.statuses?.length) {
      qb.andWhere('ticket.status IN (:...statuses)', { statuses: filters.statuses });
    }

    if (filters.from) {
      qb.andWhere('ticket.createdAt >= :from', { from: filters.from });
    }

    if (filters.to) {
      qb.andWhere('ticket.createdAt <= :to', { to: filters.to });
    }

    if (filters.buildingId) {
      qb.andWhere('ticket.buildingId = :buildingId', { buildingId: filters.buildingId });
    }

    // Plain ILIKE OR across protocol/description/location - no full-text
    // search infra in this project.
    if (filters.search) {
      qb.andWhere(
        '(ticket.protocol ILIKE :search OR ticket.description ILIKE :search OR building.name ILIKE :search OR environment.name ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    qb.orderBy('ticket.createdAt', order).skip(buildSkip(page, perPage)).take(perPage);

    const [data, total] = await qb.getManyAndCount();

    return buildPaginatedResult(data, total, page, perPage);
  }

  // Mutates the ticket row + appends one timeline event, atomically (RB-15).
  // Loads + `save()`s the entity (not `repo.update()`) so the audit
  // subscriber sees a populated "before" state.
  async updateWithEvent(
    ticketId: number,
    updates: Partial<TicketEntity>,
    eventData: Partial<TicketEventEntity>,
  ): Promise<TicketEntity> {
    const ticketUuid = await this.dataSource.transaction(async (manager) => {
      const ticketRepo = manager.getRepository(TicketEntity);
      const ticket = await ticketRepo.findOneOrFail({ where: { id: ticketId } });

      assignDefined(ticket, updates);
      const saved = await ticketRepo.save(ticket);

      const eventRepo = manager.getRepository(TicketEventEntity);
      await eventRepo.save(eventRepo.create({ ...eventData, ticketId: saved.id }));

      return saved.uuid;
    });

    return this.findByUuidWithRelations(ticketUuid) as Promise<TicketEntity>;
  }

  // Deliberately no timeline event - see `UpdateInternalNoteUseCase`'s
  // header comment for why.
  async updateInternalNote(ticketId: number, internalNote: string): Promise<TicketEntity> {
    const ticket = await this.repo.findOneOrFail({ where: { id: ticketId } });

    ticket.internalNote = internalNote;

    return this.repo.save(ticket);
  }

  // One shared filtered base query reused for volume/resolved-count/average,
  // plus a `GROUP BY current_sector_id` pass for `by_sector`.
  async getDashboardAggregates(filters: IDashboardFilters): Promise<IDashboardAggregates> {
    const baseQb = (): SelectQueryBuilder<TicketEntity> => {
      const qb = this.repo
        .createQueryBuilder('ticket')
        .leftJoin('ticket.building', 'building')
        .leftJoin('ticket.environment', 'environment')
        .where('ticket.deletedAt IS NULL');

      if (filters.sectorId) {
        qb.andWhere('ticket.currentSectorId = :sectorId', { sectorId: filters.sectorId });
      }

      if (filters.statuses?.length) {
        qb.andWhere('ticket.status IN (:...statuses)', { statuses: filters.statuses });
      }

      if (filters.from) {
        qb.andWhere('ticket.createdAt >= :from', { from: filters.from });
      }

      if (filters.to) {
        qb.andWhere('ticket.createdAt <= :to', { to: filters.to });
      }

      if (filters.buildingId) {
        qb.andWhere('ticket.buildingId = :buildingId', { buildingId: filters.buildingId });
      }

      // Same ILIKE-across-columns approach as `findManyForQueue`, so the
      // dashboard's cards/by-sector table reflect the same search the
      // ticket listing below them is filtered by.
      if (filters.search) {
        qb.andWhere(
          '(ticket.protocol ILIKE :search OR ticket.description ILIKE :search OR building.name ILIKE :search OR environment.name ILIKE :search)',
          { search: `%${filters.search}%` },
        );
      }

      return qb;
    };

    const volume = await baseQb().getCount();

    const resolvedCount = await baseQb()
      .andWhere('ticket.status = :resolvedStatus', { resolvedStatus: ETicketStatus.RESOLVED })
      .getCount();

    const avgRow = await baseQb()
      .andWhere('ticket.status = :resolvedStatus', { resolvedStatus: ETicketStatus.RESOLVED })
      .andWhere('ticket.correctSectorReachedAt IS NOT NULL')
      .select(
        'AVG(EXTRACT(EPOCH FROM (ticket.correctSectorReachedAt - ticket.createdAt)) / 60)',
        'avgMinutes',
      )
      .getRawOne<{ avgMinutes: string | null }>();

    const bySectorRows = await baseQb()
      .select('ticket.currentSectorId', 'sectorId')
      .addSelect('COUNT(*) FILTER (WHERE ticket.status = :forwardedStatus)', 'forwarded')
      .addSelect('COUNT(*) FILTER (WHERE ticket.status = :inProgressStatus)', 'inProgress')
      .addSelect('COUNT(*) FILTER (WHERE ticket.status = :resolvedStatus)', 'resolved')
      .setParameters({
        forwardedStatus: ETicketStatus.FORWARDED,
        inProgressStatus: ETicketStatus.IN_PROGRESS,
        resolvedStatus: ETicketStatus.RESOLVED,
      })
      .groupBy('ticket.currentSectorId')
      .getRawMany<{ sectorId: string; forwarded: string; inProgress: string; resolved: string }>();

    return {
      volume,
      resolvedCount,
      averageCorrectSectorMinutes: avgRow?.avgMinutes ? Number(avgRow.avgMinutes) : null,
      bySector: bySectorRows.map((row) => ({
        sectorId: Number(row.sectorId),
        forwarded: Number(row.forwarded),
        inProgress: Number(row.inProgress),
        resolved: Number(row.resolved),
      })),
    };
  }

  private unresolvedStatuses(): ETicketStatus[] {
    return [ETicketStatus.OPEN, ETicketStatus.FORWARDED, ETicketStatus.IN_PROGRESS];
  }
}
