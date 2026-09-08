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

// `TicketEntity` is pulled in via its own `TypeOrmModule.forFeature` rather
// than importing `TicketsModule`, since this module only needs read access
// (no `TicketsRepository` write-path methods) — event rows are read off
// `TicketEntity.events` via query builder joins/relations directly.
@Module({
  imports: [SharedModule, SectorsModule, LocationsModule, TypeOrmModule.forFeature([TicketEntity])],
  controllers: [ResearchController],
  providers: [ResearchRepository, GetResearchIndicatorsUseCase, ExportResearchDataUseCase],
})
export class ResearchModule {}
