import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SharedModule } from '@shared/shared.module';

import { LocationsController } from './controllers/locations.controller';
import { BuildingEntity } from './entities/building.entity';
import { EnvironmentEntity } from './entities/environment.entity';
import { LocationsRepository } from './repositories/locations.repository';
import { ListLocationsUseCase } from './use-cases/list-locations.use-case';

@Module({
  imports: [SharedModule, TypeOrmModule.forFeature([BuildingEntity, EnvironmentEntity])],
  controllers: [LocationsController],
  providers: [LocationsRepository, ListLocationsUseCase],
  exports: [LocationsRepository],
})
export class LocationsModule {}
