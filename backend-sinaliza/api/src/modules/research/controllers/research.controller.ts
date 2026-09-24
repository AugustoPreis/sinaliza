import { Controller, Get, Query, StreamableFile } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequirePermission } from '@shared/decorators';

import { ResearchExportQueryDTO } from '../dtos/research-export-query.dto';
import { ResearchIndicatorsQueryDTO } from '../dtos/research-indicators-query.dto';
import { ResearchIndicatorsResponseDTO } from '../dtos/research-indicators-response.dto';
import { ExportResearchDataUseCase } from '../use-cases/export-research-data.use-case';
import { GetResearchIndicatorsUseCase } from '../use-cases/get-research-indicators.use-case';

// Gated behind dedicated `research:read`/`research:export` permissions,
// distinct from `tickets:read-all` (operational `/admin/tickets` and
// `/admin/dashboard`).
@ApiTags('Admin Research')
@ApiBearerAuth()
@Controller({ path: 'admin/research', version: '1' })
export class ResearchController {
  constructor(
    private readonly getResearchIndicatorsUseCase: GetResearchIndicatorsUseCase,
    private readonly exportResearchDataUseCase: ExportResearchDataUseCase,
  ) {}

  @Get('indicators')
  @RequirePermission('research', 'read')
  @ApiOperation({
    summary: 'Research indicators: automatic accuracy, corrections, volume (Tela C.5)',
  })
  indicators(@Query() query: ResearchIndicatorsQueryDTO): Promise<ResearchIndicatorsResponseDTO> {
    return this.getResearchIndicatorsUseCase.execute(query);
  }

  @Get('export')
  @RequirePermission('research', 'export')
  @ApiOperation({ summary: 'Export research data (classification/correction/timing) as xlsx' })
  async export(@Query() query: ResearchExportQueryDTO): Promise<StreamableFile> {
    const { buffer, filename } = await this.exportResearchDataUseCase.execute(query);

    return new StreamableFile(buffer, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      disposition: `attachment; filename="${filename}"`,
    });
  }
}
