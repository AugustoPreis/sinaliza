import { getSectors } from '@core/api/generated/sectors/sectors';

// Same situation as locations.service.ts: GET /api/v1/sectors has no
// documented response schema in the live OpenAPI spec, so orval generated
// `void` for it. This reflects the actual JSON payload.
export interface ISectorListItem {
  id: string;
  name: string;
}

export interface ISectorsResponse {
  items: ISectorListItem[];
}

const sectors = getSectors();

export function fetchSectors(): Promise<ISectorsResponse> {
  return sectors.sectorsControllerFindAllV1() as unknown as Promise<ISectorsResponse>;
}
