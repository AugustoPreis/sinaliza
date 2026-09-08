import { ApiProperty } from '@nestjs/swagger';

import { SectorEntity } from '@modules/sectors/entities/sector.entity';

import { IDashboardAggregates } from '../repositories/tickets.repository';

export class AdminDashboardSummaryDTO {
  @ApiProperty()
  volume!: number;

  @ApiProperty()
  resolved_percentage!: number;

  @ApiProperty()
  average_time_to_correct_sector_minutes!: number;
}

export class AdminDashboardSectorRowDTO {
  @ApiProperty()
  sector_id!: string;

  @ApiProperty()
  sector_name!: string;

  @ApiProperty()
  forwarded!: number;

  @ApiProperty()
  in_progress!: number;

  @ApiProperty()
  resolved!: number;
}

// `GET /admin/dashboard` response shape (endpoints-sinaliza.md §11.2). Built
// from `TicketsRepository.getDashboardAggregates` (numeric sector ids) plus
// a `sectorId -> SectorEntity` map to resolve the public uuid/name pair.
export class AdminDashboardResponseDTO {
  @ApiProperty({ type: AdminDashboardSummaryDTO })
  summary!: AdminDashboardSummaryDTO;

  @ApiProperty({ type: [AdminDashboardSectorRowDTO] })
  by_sector!: AdminDashboardSectorRowDTO[];

  static from(
    aggregates: IDashboardAggregates,
    sectorById: Map<number, SectorEntity>,
  ): AdminDashboardResponseDTO {
    const dto = new AdminDashboardResponseDTO();

    dto.summary = {
      volume: aggregates.volume,
      resolved_percentage: aggregates.volume
        ? round1(aggregates.resolvedCount / aggregates.volume * 100)
        : 0,
      average_time_to_correct_sector_minutes: aggregates.averageCorrectSectorMinutes
        ? round1(aggregates.averageCorrectSectorMinutes)
        : 0,
    };

    dto.by_sector = aggregates.bySector
      .map((row) => {
        const sector = sectorById.get(row.sectorId);

        if (!sector) return null;

        return {
          sector_id: sector.uuid,
          sector_name: sector.name,
          forwarded: row.forwarded,
          in_progress: row.inProgress,
          resolved: row.resolved,
        };
      })
      .filter((row): row is AdminDashboardSectorRowDTO => row !== null);

    return dto;
  }
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
