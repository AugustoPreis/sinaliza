import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { LocationQueryDTO } from '../dtos/location-query.dto';
import { BuildingResponseDTO } from '../dtos/location-response.dto';
import { ListLocationsUseCase } from '../use-cases/list-locations.use-case';

// No `@RequirePermission`: any authenticated user picks a location.
@ApiTags('Locations')
@ApiBearerAuth()
@Controller({ path: 'locations', version: '1' })
export class LocationsController {
  constructor(private readonly listLocationsUseCase: ListLocationsUseCase) {}

  @Get()
  @ApiOperation({ summary: 'List buildings with nested environments (Tela A.3 picker)' })
  findAll(@Query() query: LocationQueryDTO): Promise<{ buildings: BuildingResponseDTO[] }> {
    return this.listLocationsUseCase.execute(query.building_id);
  }
}
