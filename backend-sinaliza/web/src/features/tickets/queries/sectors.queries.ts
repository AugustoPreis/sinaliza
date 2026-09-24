import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import * as sectorsService from '../services/sectors.service';

export const sectorQueryKeys = {
  all: ['sectors'] as const,
};

type ISectorsQueryResult = Awaited<ReturnType<typeof sectorsService.fetchSectors>>;

export function useSectorsQuery(): UseQueryResult<ISectorsQueryResult> {
  return useQuery({
    queryKey: sectorQueryKeys.all,
    queryFn: () => sectorsService.fetchSectors(),
    staleTime: 5 * 60 * 1000,
  });
}
