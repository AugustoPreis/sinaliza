import type {
  SectorTicketsControllerFindAllV1Order,
  SectorTicketsControllerFindAllV1StatusItem,
} from '@core/api/generated/sinalizaAPI.schemas';

export interface ISectorTicketFilters extends Record<string, unknown> {
  status: SectorTicketsControllerFindAllV1StatusItem[];
  buildingId?: string;
  from?: string;
  to?: string;
  search: string;
  order: SectorTicketsControllerFindAllV1Order;
}
