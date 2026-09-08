import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { BuildingEntity } from '../entities/building.entity';
import { EnvironmentEntity } from '../entities/environment.entity';

@Injectable()
export class LocationsRepository {
  constructor(
    @InjectRepository(BuildingEntity)
    private readonly buildingRepo: Repository<BuildingEntity>,
    @InjectRepository(EnvironmentEntity)
    private readonly environmentRepo: Repository<EnvironmentEntity>,
  ) {}

  findAllWithEnvironments(buildingUuid?: string): Promise<BuildingEntity[]> {
    return this.buildingRepo.find({
      where: buildingUuid ? { uuid: buildingUuid } : {},
      relations: { environments: true },
      order: { name: 'ASC', environments: { name: 'ASC' } },
    });
  }

  // Phase 3 (`modules/tickets`): `POST /tickets` validates the location the
  // requester picked before persisting the ticket.
  findBuildingByUuid(uuid: string): Promise<BuildingEntity | null> {
    return this.buildingRepo.findOne({ where: { uuid } });
  }

  findEnvironmentByUuid(uuid: string): Promise<EnvironmentEntity | null> {
    return this.environmentRepo.findOne({ where: { uuid } });
  }
}
