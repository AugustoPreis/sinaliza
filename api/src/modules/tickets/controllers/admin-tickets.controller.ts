import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequirePermission } from '@shared/decorators';

import { AdminDashboardQueryDTO } from '../dtos/admin-dashboard-query.dto';
import { AdminDashboardResponseDTO } from '../dtos/admin-dashboard-response.dto';
import { AdminTicketQueryDTO } from '../dtos/admin-ticket-query.dto';
import { AdminTicketListResponseDTO } from '../dtos/admin-ticket-response.dto';
import { GetAdminDashboardUseCase } from '../use-cases/get-admin-dashboard.use-case';
import { ListAdminTicketsUseCase } from '../use-cases/list-admin-tickets.use-case';

// `GET /admin/tickets`, `GET /admin/dashboard` (endpoints-sinaliza.md §11).
// Implementation decision (§19 doesn't distinguish these two): both are
// gated behind the single `tickets:read-all` permission rather than a
// separate `research:read`/`dashboard:read` — the doc's matrix only has one
// row ("Ver todos os chamados") that plausibly covers both "see every
// ticket" and "see the aggregate view of every ticket", and
// `tickets:read-all` was already the name reserved for this in Phase 3's
// `PermissionsSeeder`. `research:read`/`research:export` (§15, a later
// phase) are a distinct concern: per-ticket/aggregate research indicators
// and export, not this operational dashboard.
@ApiTags('Admin Tickets')
@ApiBearerAuth()
@Controller({ path: 'admin', version: '1' })
export class AdminTicketsController {
  constructor(
    private readonly listAdminTicketsUseCase: ListAdminTicketsUseCase,
    private readonly getAdminDashboardUseCase: GetAdminDashboardUseCase,
  ) {}

  @Get('tickets')
  @RequirePermission('tickets', 'read-all')
  @ApiOperation({ summary: 'List every ticket across all sectors (administration overview)' })
  findAll(@Query() query: AdminTicketQueryDTO): Promise<AdminTicketListResponseDTO> {
    return this.listAdminTicketsUseCase.execute(query);
  }

  @Get('dashboard')
  @RequirePermission('tickets', 'read-all')
  @ApiOperation({ summary: 'Aggregate volume/resolution/by-sector panel (Tela C.1)' })
  dashboard(@Query() query: AdminDashboardQueryDTO): Promise<AdminDashboardResponseDTO> {
    return this.getAdminDashboardUseCase.execute(query);
  }
}
