import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser, RequirePermission } from '@shared/decorators';

import { SectorTicketQueryDTO } from '../dtos/sector-ticket-query.dto';
import { SectorTicketListResponseDTO } from '../dtos/sector-ticket-response.dto';
import { ListSectorTicketsUseCase } from '../use-cases/list-sector-tickets.use-case';

// `GET /sector/tickets` (endpoints-sinaliza.md §10.1) — Telas B.2/B.4. A
// separate top-level resource from `TicketsController` because it isn't
// scoped to one ticket id, same reasoning as `AdminTicketsController`.
@ApiTags('Sector Tickets')
@ApiBearerAuth()
@Controller({ path: 'sector/tickets', version: '1' })
export class SectorTicketsController {
  constructor(private readonly listSectorTicketsUseCase: ListSectorTicketsUseCase) {}

  @Get()
  @RequirePermission('tickets', 'read-sector')
  @ApiOperation({ summary: "List the caller's sector queue(s) (Telas B.2/B.4)" })
  findAll(
    @CurrentUser('uuid') currentUserUuid: string,
    @Query() query: SectorTicketQueryDTO,
  ): Promise<SectorTicketListResponseDTO> {
    return this.listSectorTicketsUseCase.execute(currentUserUuid, query);
  }
}
