export interface IResearchFilters extends Record<string, unknown> {
  sectorId?: string;
  buildingId?: string;
  from?: string;
  to?: string;
}
