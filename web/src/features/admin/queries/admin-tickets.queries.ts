import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import type {
  AdminDashboardResponseDTO,
  AdminTicketListResponseDTO,
  AdminTicketsControllerDashboardV1Params,
  AdminTicketsControllerFindAllV1Params,
} from '@core/api/generated/sinalizaAPI.schemas';

import * as adminTicketsService from '../services/admin-tickets.service';

export const adminTicketQueryKeys = {
  all: ['admin-tickets'] as const,
  dashboard: (params: AdminTicketsControllerDashboardV1Params) =>
    [...adminTicketQueryKeys.all, 'dashboard', params] as const,
  list: (params: AdminTicketsControllerFindAllV1Params) =>
    [...adminTicketQueryKeys.all, 'list', params] as const,
};

export function useAdminDashboardQuery(
  params: AdminTicketsControllerDashboardV1Params,
): UseQueryResult<AdminDashboardResponseDTO> {
  return useQuery({
    queryKey: adminTicketQueryKeys.dashboard(params),
    queryFn: () => adminTicketsService.fetchAdminDashboard(params),
    placeholderData: (previousData) => previousData,
  });
}

export function useAdminTicketsQuery(
  params: AdminTicketsControllerFindAllV1Params,
): UseQueryResult<AdminTicketListResponseDTO> {
  return useQuery({
    queryKey: adminTicketQueryKeys.list(params),
    queryFn: () => adminTicketsService.fetchAdminTickets(params),
    placeholderData: (previousData) => previousData,
  });
}
