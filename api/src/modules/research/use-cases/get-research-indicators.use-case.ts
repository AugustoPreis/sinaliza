import { HttpStatus, Injectable } from '@nestjs/common';

import { AppException } from '@shared/exceptions';

import { BuildingEntity } from '@modules/locations/entities/building.entity';
import { LocationsRepository } from '@modules/locations/repositories/locations.repository';
import { SectorEntity } from '@modules/sectors/entities/sector.entity';
import { SectorsRepository } from '@modules/sectors/repositories/sectors.repository';

import { ResearchIndicatorsQueryDTO } from '../dtos/research-indicators-query.dto';
import {
  ResearchIndicatorsResponseDTO,
  VolumeByCategoryRowDTO,
} from '../dtos/research-indicators-response.dto';
import {
  IResearchCountRow,
  IResearchFilters,
  ResearchRepository,
} from '../repositories/research.repository';

// `GET /admin/research/indicators` (endpoints-sinaliza.md §15.1) — Tela C.5
// and the research hypothesis in the functional doc ("classificação e
// encaminhamento automáticos reduzem erro e tempo, em comparação com o
// processo manual?").
@Injectable()
export class GetResearchIndicatorsUseCase {
  constructor(
    private readonly researchRepository: ResearchRepository,
    private readonly sectorsRepository: SectorsRepository,
    private readonly locationsRepository: LocationsRepository,
  ) {}

  async execute(query: ResearchIndicatorsQueryDTO): Promise<ResearchIndicatorsResponseDTO> {
    let sectorId: number | undefined;

    if (query.sector_id) {
      const sector = await this.sectorsRepository.findByUuid(query.sector_id);

      if (!sector) {
        throw AppException.from('sectors.errors.notFound', HttpStatus.NOT_FOUND, {
          args: { uuid: query.sector_id },
        });
      }

      sectorId = sector.id;
    }

    let buildingId: number | undefined;

    if (query.building_id) {
      const building = await this.locationsRepository.findBuildingByUuid(query.building_id);

      if (!building) {
        throw AppException.from('locations.errors.buildingNotFound', HttpStatus.NOT_FOUND, {
          args: { uuid: query.building_id },
        });
      }

      buildingId = building.id;
    }

    const filters: IResearchFilters = { from: query.from, to: query.to, sectorId, buildingId };

    const data = await this.researchRepository.getIndicatorsData(filters);

    const sectors = await this.sectorsRepository.findAll();
    const sectorById = new Map<number, SectorEntity>(sectors.map((sector) => [sector.id, sector]));

    const buildings = await this.locationsRepository.findAllWithEnvironments();
    const buildingById = new Map<number, BuildingEntity>(
      buildings.map((building) => [building.id, building]),
    );

    const dto = new ResearchIndicatorsResponseDTO();

    dto.automatic_accuracy = {
      total_tickets: data.totalTickets,
      correct_without_any_correction: data.correctWithoutAnyCorrection,
      percentage: data.totalTickets
        ? round1((data.correctWithoutAnyCorrection / data.totalTickets) * 100)
        : 0,
    };

    dto.corrections = {
      by_requester: data.correctionsByRequester,
      by_sector: data.correctionsBySector,
    };

    dto.time_to_correct_sector = {
      average_minutes: round1(average(data.correctSectorMinutes)),
      median_minutes: round1(median(data.correctSectorMinutes)),
    };

    dto.volume = {
      by_sector: mapSectorRows(data.volumeBySector, sectorById),
      by_category: buildCategoryVolume(data.volumeByAutomaticSector, sectorById),
      by_location: mapLocationRows(data.volumeByLocation, buildingById),
    };

    return dto;
  }
}

function mapSectorRows(
  rows: IResearchCountRow[],
  sectorById: Map<number, SectorEntity>,
): Array<{ sector_id: string; sector_name: string; count: number }> {
  return rows
    .map((row) => {
      const sector = sectorById.get(row.key);

      if (!sector) return null;

      return { sector_id: sector.uuid, sector_name: sector.name, count: row.count };
    })
    .filter((row): row is { sector_id: string; sector_name: string; count: number } => row !== null);
}

function mapLocationRows(
  rows: IResearchCountRow[],
  buildingById: Map<number, BuildingEntity>,
): Array<{ building_id: string; building_name: string; count: number }> {
  return rows
    .map((row) => {
      const building = buildingById.get(row.key);

      if (!building) return null;

      return { building_id: building.uuid, building_name: building.name, count: row.count };
    })
    .filter(
      (row): row is { building_id: string; building_name: string; count: number } => row !== null,
    );
}

// Decision (there is no `category` column on `Ticket` — endpoints-sinaliza.md
// §16 doesn't have one, only `SectorEntity.categories`, which is a list of
// tags per SETOR, not per chamado): a ticket's "category" for this indicator
// is the FIRST tag of its `automaticSectorId`'s `categories` list — i.e. the
// tag the keyword classifier most likely matched to route it there in the
// first place (categories are seeded/edited in a meaningful "most
// representative first" order, e.g. `sec_manutencao` → ["vazamento",
// "elétrica", "porta", "janela"]). When a sector has no categories configured
// (`categories` empty), its name is used as the category label instead, so
// every ticket still counts somewhere instead of being silently dropped.
// Categories collapse across sectors: two sectors sharing a first tag (or a
// sector's name colliding with another sector's first tag) are merged into
// one row, since the indicator is about the LABEL, not the sector identity —
// `by_sector` already covers the per-sector breakdown.
function buildCategoryVolume(
  rows: IResearchCountRow[],
  sectorById: Map<number, SectorEntity>,
): VolumeByCategoryRowDTO[] {
  const countByCategory = new Map<string, number>();

  for (const row of rows) {
    const sector = sectorById.get(row.key);
    if (!sector) continue;

    const category = sector.categories[0] ?? sector.name;

    countByCategory.set(category, (countByCategory.get(category) ?? 0) + row.count);
  }

  return [...countByCategory.entries()]
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);
}

function average(values: number[]): number {
  if (!values.length) return 0;

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function median(values: number[]): number {
  if (!values.length) return 0;

  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
