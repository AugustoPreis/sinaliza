import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import * as locationsService from '../services/locations.service';

export const locationQueryKeys = {
  all: ['locations'] as const,
};

type ILocationsQueryResult = Awaited<ReturnType<typeof locationsService.fetchLocations>>;

export function useLocationsQuery(): UseQueryResult<ILocationsQueryResult> {
  return useQuery({
    queryKey: locationQueryKeys.all,
    queryFn: () => locationsService.fetchLocations(),
    staleTime: 5 * 60 * 1000,
  });
}
