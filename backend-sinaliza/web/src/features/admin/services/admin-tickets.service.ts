import { getAdminTickets } from '@core/api/generated/admin-tickets/admin-tickets';
import type {
  AdminDashboardResponseDTO,
  AdminTicketListResponseDTO,
  AdminTicketsControllerDashboardV1Params,
  AdminTicketsControllerFindAllV1Params,
} from '@core/api/generated/sinalizaAPI.schemas';

const adminTickets = getAdminTickets();

export function fetchAdminDashboard(
  params?: AdminTicketsControllerDashboardV1Params,
): Promise<AdminDashboardResponseDTO> {
  return adminTickets.adminTicketsControllerDashboardV1(params);
}

export function fetchAdminTickets(
  params?: AdminTicketsControllerFindAllV1Params,
): Promise<AdminTicketListResponseDTO> {
  return adminTickets.adminTicketsControllerFindAllV1(params);
}
