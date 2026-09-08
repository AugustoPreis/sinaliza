import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SharedModule } from '@shared/shared.module';

import { LocationsModule } from '@modules/locations/locations.module';
import { SectorsModule } from '@modules/sectors/sectors.module';
import { TicketEntity } from '@modules/tickets/entities/ticket.entity';

import { ResearchController } from './controllers/research.controller';
import { ResearchRepository } from './repositories/research.repository';
import { ExportResearchDataUseCase } from './use-cases/export-research-data.use-case';
import { GetResearchIndicatorsUseCase } from './use-cases/get-research-indicators.use-case';

// Phase 5 (last domain module): §15's research indicators/export. Reuses
// `TicketEntity` straight from `modules/tickets` (via its own
// `TypeOrmModule.forFeature`, not by importing `TicketsModule`, since it only
// needs read access to that table and none of `TicketsRepository`'s
// write-path methods — the `REASSIGNED`-event counts and the export's event
// rows are both read off `TicketEntity.events` via query builder joins/
// relations, no separate `TicketEventEntity` repository injection needed)
// plus `SectorsModule`/`LocationsModule` for resolving sector/building uuids
// and names in the indicators response.
@Module({
  imports: [SharedModule, SectorsModule, LocationsModule, TypeOrmModule.forFeature([TicketEntity])],
  controllers: [ResearchController],
  providers: [ResearchRepository, GetResearchIndicatorsUseCase, ExportResearchDataUseCase],
})
export class ResearchModule {}
