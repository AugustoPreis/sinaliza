import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequirePermission } from '@shared/decorators';
import { ParseUuidPipe } from '@shared/pipes/parse-uuid.pipe';

import { CreateSectorDTO } from '../dtos/create-sector.dto';
import { SectorMutationResponseDTO } from '../dtos/sector-mutation-response.dto';
import { SectorResponseDTO } from '../dtos/sector-response.dto';
import { UpdateSectorDTO } from '../dtos/update-sector.dto';
import { CreateSectorUseCase } from '../use-cases/create-sector.use-case';
import { ListAdminSectorsUseCase } from '../use-cases/list-admin-sectors.use-case';
import { UpdateSectorUseCase } from '../use-cases/update-sector.use-case';

// No DELETE: sectors are never deleted, only renamed/recategorized.
@ApiTags('Admin Sectors')
@ApiBearerAuth()
@Controller({ path: 'admin/sectors', version: '1' })
export class AdminSectorsController {
  constructor(
    private readonly listAdminSectorsUseCase: ListAdminSectorsUseCase,
    private readonly createSectorUseCase: CreateSectorUseCase,
    private readonly updateSectorUseCase: UpdateSectorUseCase,
  ) {}

  @Get()
  @RequirePermission('sectors', 'read')
  @ApiOperation({ summary: 'List sectors with categories and responsible users (Tela C.2)' })
  findAll(@Query('search') search?: string): Promise<{ items: SectorResponseDTO[] }> {
    return this.listAdminSectorsUseCase.execute(search);
  }

  @Post()
  @RequirePermission('sectors', 'manage')
  @ApiOperation({ summary: 'Create a sector' })
  create(@Body() dto: CreateSectorDTO): Promise<SectorMutationResponseDTO> {
    return this.createSectorUseCase.execute(dto);
  }

  @Patch(':sectorId')
  @RequirePermission('sectors', 'manage')
  @ApiOperation({ summary: 'Update a sector name/categories/responsible users' })
  update(
    @Param('sectorId', ParseUuidPipe) sectorId: string,
    @Body() dto: UpdateSectorDTO,
  ): Promise<SectorMutationResponseDTO> {
    return this.updateSectorUseCase.execute(sectorId, dto);
  }
}
