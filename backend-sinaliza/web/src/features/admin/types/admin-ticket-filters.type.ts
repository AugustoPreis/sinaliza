import type { AdminTicketsControllerFindAllV1StatusItem } from '@core/api/generated/sinalizaAPI.schemas';

export interface IAdminTicketFilters extends Record<string, unknown> {
  sectorId?: string;
  status: AdminTicketsControllerFindAllV1StatusItem[];
  buildingId?: string;
  from?: string;
  to?: string;
  search: string;
}
