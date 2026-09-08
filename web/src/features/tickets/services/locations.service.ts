import { getLocations } from '@core/api/generated/locations/locations';
import type { LocationsControllerFindAllV1Params } from '@core/api/generated/sinalizaAPI.schemas';

// The generated client types this endpoint's response as `void` because the
// live OpenAPI spec doesn't document a response schema for it — the shape
// below reflects the actual JSON returned by GET /api/v1/locations.
export interface ILocationEnvironment {
  id: string;
  name: string;
}

export interface ILocationBuilding {
  id: string;
  name: string;
  environments: ILocationEnvironment[];
}

export interface ILocationsResponse {
  buildings: ILocationBuilding[];
}

const locations = getLocations();

export function fetchLocations(
  params?: LocationsControllerFindAllV1Params,
): Promise<ILocationsResponse> {
  return locations.locationsControllerFindAllV1(params) as unknown as Promise<ILocationsResponse>;
}
