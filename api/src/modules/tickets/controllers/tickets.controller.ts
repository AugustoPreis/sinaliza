import { Body, Controller, Get, Param, Patch, Post, Query, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser, RequirePermission } from '@shared/decorators';
import { ParseUuidPipe } from '@shared/pipes/parse-uuid.pipe';

import { CreateTicketDTO } from '../dtos/create-ticket.dto';
import { ReassignTicketResponseDTO } from '../dtos/reassign-ticket-response.dto';
import { ReassignTicketDTO } from '../dtos/reassign-ticket.dto';
import { TicketDetailResponseDTO } from '../dtos/ticket-detail-response.dto';
import { TicketListResponseDTO } from '../dtos/ticket-list-item-response.dto';
import { TicketQueryDTO } from '../dtos/ticket-query.dto';
import { TicketResponseDTO } from '../dtos/ticket-response.dto';
import { UpdateInternalNoteResponseDTO } from '../dtos/update-internal-note-response.dto';
import { UpdateInternalNoteDTO } from '../dtos/update-internal-note.dto';
import { UpdateTicketStatusResponseDTO } from '../dtos/update-ticket-status-response.dto';
import { UpdateTicketStatusDTO } from '../dtos/update-ticket-status.dto';
import { CreateTicketUseCase } from '../use-cases/create-ticket.use-case';
import { GetTicketUseCase } from '../use-cases/get-ticket.use-case';
import { ListMyTicketsUseCase } from '../use-cases/list-my-tickets.use-case';
import { ReassignTicketUseCase } from '../use-cases/reassign-ticket.use-case';
import { UpdateInternalNoteUseCase } from '../use-cases/update-internal-note.use-case';
import { UpdateTicketStatusUseCase } from '../use-cases/update-ticket-status.use-case';

// `POST/GET /tickets`, `GET /tickets/{ticketId}` (endpoints-sinaliza.md §8) —
// the solicitante-facing core of the ticket lifecycle — plus Phase 4's
// sector/admin mutations on a single ticket (§10.2-10.4): status, reassign,
// internal note. `/sector/tickets` and `/admin/tickets` queue listings live
// in their own controllers instead, since they're not scoped to one ticket.
@ApiTags('Tickets')
@ApiBearerAuth()
@Controller({ path: 'tickets', version: '1' })
export class TicketsController {
  constructor(
    private readonly createTicketUseCase: CreateTicketUseCase,
    private readonly listMyTicketsUseCase: ListMyTicketsUseCase,
    private readonly getTicketUseCase: GetTicketUseCase,
    private readonly updateTicketStatusUseCase: UpdateTicketStatusUseCase,
    private readonly reassignTicketUseCase: ReassignTicketUseCase,
    private readonly updateInternalNoteUseCase: UpdateInternalNoteUseCase,
  ) {}

  @Post()
  @RequirePermission('tickets', 'create')
  @UseInterceptors(FilesInterceptor('photos'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: CreateTicketDTO })
  @ApiOperation({ summary: 'Create and forward a ticket (Tela A.4 submit)' })
  create(
    @CurrentUser('uuid') currentUserUuid: string,
    @Body() dto: CreateTicketDTO,
    @UploadedFiles() photos: Express.Multer.File[],
  ): Promise<TicketResponseDTO> {
    // The requester always comes from the authenticated user, never from
    // the request body — the use-case resolves the numeric id from this uuid.
    return this.createTicketUseCase.execute(currentUserUuid, dto, photos);
  }

  @Get()
  // Deliberately no `@RequirePermission`: this always lists "my own"
  // tickets, scoped by the authenticated user, not by a granted permission —
  // same self-service idiom as `UsersController#updatePassword`.
  @ApiOperation({ summary: "List the requester's own tickets (Tela A.2)" })
  findMine(
    @CurrentUser('uuid') currentUserUuid: string,
    @Query() query: TicketQueryDTO,
  ): Promise<TicketListResponseDTO> {
    return this.listMyTicketsUseCase.execute(currentUserUuid, query);
  }

  @Get(':ticketId')
  // No `@RequirePermission` either: access here depends on who owns/handles
  // this specific ticket, not on a flat resource:action grant — see
  // `GetTicketUseCase` for the actual authorization logic.
  @ApiOperation({ summary: 'Get ticket detail and timeline (Tela A.6)' })
  findOne(
    @CurrentUser('uuid') currentUserUuid: string,
    @Param('ticketId', ParseUuidPipe) ticketId: string,
  ): Promise<TicketDetailResponseDTO> {
    return this.getTicketUseCase.execute(currentUserUuid, ticketId);
  }

  @Patch(':ticketId/status')
  @RequirePermission('tickets', 'update-status')
  @ApiOperation({ summary: 'Move a ticket to IN_PROGRESS or RESOLVED (Tela B.3)' })
  updateStatus(
    @CurrentUser('uuid') currentUserUuid: string,
    @Param('ticketId', ParseUuidPipe) ticketId: string,
    @Body() dto: UpdateTicketStatusDTO,
  ): Promise<UpdateTicketStatusResponseDTO> {
    return this.updateTicketStatusUseCase.execute(currentUserUuid, ticketId, dto);
  }

  @Post(':ticketId/reassign')
  @RequirePermission('tickets', 'reassign')
  @ApiOperation({ summary: 'Reassign a ticket to another sector (Tela B.3)' })
  reassign(
    @CurrentUser('uuid') currentUserUuid: string,
    @Param('ticketId', ParseUuidPipe) ticketId: string,
    @Body() dto: ReassignTicketDTO,
  ): Promise<ReassignTicketResponseDTO> {
    return this.reassignTicketUseCase.execute(currentUserUuid, ticketId, dto);
  }

  @Patch(':ticketId/internal-note')
  @RequirePermission('tickets', 'internal-note')
  @ApiOperation({ summary: 'Set/update the sector-only internal note (Tela B.3)' })
  updateInternalNote(
    @CurrentUser('uuid') currentUserUuid: string,
    @Param('ticketId', ParseUuidPipe) ticketId: string,
    @Body() dto: UpdateInternalNoteDTO,
  ): Promise<UpdateInternalNoteResponseDTO> {
    return this.updateInternalNoteUseCase.execute(currentUserUuid, ticketId, dto);
  }
}
