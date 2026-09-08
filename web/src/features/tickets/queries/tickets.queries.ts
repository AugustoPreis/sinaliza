import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

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
import type { ApiError } from '@core/errors/error.types';

import * as ticketsService from '../services/tickets.service';

export const ticketQueryKeys = {
  all: ['tickets'] as const,
  sectorList: (params: SectorTicketsControllerFindAllV1Params) =>
    [...ticketQueryKeys.all, 'sector-list', params] as const,
  detail: (ticketId: string) => [...ticketQueryKeys.all, 'detail', ticketId] as const,
};

export function useSectorTicketsQuery(
  params: SectorTicketsControllerFindAllV1Params,
): UseQueryResult<SectorTicketListResponseDTO> {
  return useQuery({
    queryKey: ticketQueryKeys.sectorList(params),
    queryFn: () => ticketsService.fetchSectorTickets(params),
    placeholderData: (previousData) => previousData,
  });
}

export function useTicketDetailQuery(ticketId: string): UseQueryResult<TicketDetailResponseDTO> {
  return useQuery({
    queryKey: ticketQueryKeys.detail(ticketId),
    queryFn: () => ticketsService.fetchTicketDetail(ticketId),
  });
}

export function useUpdateTicketStatusMutation(
  ticketId: string,
): UseMutationResult<UpdateTicketStatusResponseDTO, ApiError, UpdateTicketStatusDTO> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto) => ticketsService.updateTicketStatus(ticketId, dto),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ticketQueryKeys.detail(ticketId) });
      void queryClient.invalidateQueries({ queryKey: ticketQueryKeys.all });
    },
  });
}

export function useReassignTicketMutation(
  ticketId: string,
): UseMutationResult<ReassignTicketResponseDTO, ApiError, ReassignTicketDTO> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto) => ticketsService.reassignTicket(ticketId, dto),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ticketQueryKeys.detail(ticketId) });
      void queryClient.invalidateQueries({ queryKey: ticketQueryKeys.all });
    },
  });
}

export function useUpdateInternalNoteMutation(
  ticketId: string,
): UseMutationResult<UpdateInternalNoteResponseDTO, ApiError, UpdateInternalNoteDTO> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto) => ticketsService.updateTicketInternalNote(ticketId, dto),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ticketQueryKeys.detail(ticketId) });
      void queryClient.invalidateQueries({ queryKey: ticketQueryKeys.all });
    },
  });
}
