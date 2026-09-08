import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { SectorSummaryDTO } from '../dtos/sector-summary.dto';
import { ListSectorsUseCase } from '../use-cases/list-sectors.use-case';

// Deliberately no `@RequirePermission`: any authenticated user may list
// sectors to populate a picker; only auth-gated by the global `JwtAuthGuard`.
@ApiTags('Sectors')
@ApiBearerAuth()
@Controller({ path: 'sectors', version: '1' })
export class SectorsController {
  constructor(private readonly listSectorsUseCase: ListSectorsUseCase) {}

  @Get()
  @ApiOperation({ summary: 'List available sectors (Tela A.4 / Tela B.3 picker)' })
  findAll(): Promise<{ items: SectorSummaryDTO[] }> {
    return this.listSectorsUseCase.execute();
  }
}
