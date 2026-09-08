import { getSectorTickets } from '@core/api/generated/sector-tickets/sector-tickets';
import type {
  ReassignTicketDTO,
  ReassignTicketResponseDTO,
  SectorTicketListResponseDTO,
  SectorTicketsControllerFindAllV1Params,
  TicketDetailResponseDTO,
  UpdateInternalNoteDTO,
  UpdateInternalNoteResponseDTO,
  UpdateTicketStatusDTO,
  UpdateTicketStatusResponseDTO,
} from '@core/api/generated/sinalizaAPI.schemas';
import { getTickets } from '@core/api/generated/tickets/tickets';

const sectorTickets = getSectorTickets();
const tickets = getTickets();

export function fetchSectorTickets(
  params: SectorTicketsControllerFindAllV1Params,
): Promise<SectorTicketListResponseDTO> {
  return sectorTickets.sectorTicketsControllerFindAllV1(params);
}

export function fetchTicketDetail(ticketId: string): Promise<TicketDetailResponseDTO> {
  return tickets.ticketsControllerFindOneV1(ticketId);
}

export function updateTicketStatus(
  ticketId: string,
  dto: UpdateTicketStatusDTO,
): Promise<UpdateTicketStatusResponseDTO> {
  return tickets.ticketsControllerUpdateStatusV1(ticketId, dto);
}

export function reassignTicket(
  ticketId: string,
  dto: ReassignTicketDTO,
): Promise<ReassignTicketResponseDTO> {
  return tickets.ticketsControllerReassignV1(ticketId, dto);
}

export function updateTicketInternalNote(
  ticketId: string,
  dto: UpdateInternalNoteDTO,
): Promise<UpdateInternalNoteResponseDTO> {
  return tickets.ticketsControllerUpdateInternalNoteV1(ticketId, dto);
}
