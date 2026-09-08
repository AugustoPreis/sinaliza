import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import type {
  ResearchControllerIndicatorsV1Params,
  ResearchIndicatorsResponseDTO,
} from '@core/api/generated/sinalizaAPI.schemas';

import * as adminResearchService from '../services/admin-research.service';

export const adminResearchQueryKeys = {
  all: ['admin-research'] as const,
  indicators: (params: ResearchControllerIndicatorsV1Params) =>
    [...adminResearchQueryKeys.all, 'indicators', params] as const,
};

export function useResearchIndicatorsQuery(
  params: ResearchControllerIndicatorsV1Params,
): UseQueryResult<ResearchIndicatorsResponseDTO> {
  return useQuery({
    queryKey: adminResearchQueryKeys.indicators(params),
    queryFn: () => adminResearchService.fetchResearchIndicators(params),
    placeholderData: (previousData) => previousData,
  });
}
