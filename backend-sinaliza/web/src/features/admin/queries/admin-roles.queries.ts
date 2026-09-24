import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import type { RolesControllerFindAllV1200 } from '@core/api/generated/sinalizaAPI.schemas';

import * as adminRolesService from '../services/admin-roles.service';

export const adminRoleQueryKeys = {
  all: ['admin-roles'] as const,
};

export function useRolesQuery(): UseQueryResult<RolesControllerFindAllV1200> {
  return useQuery({
    queryKey: adminRoleQueryKeys.all,
    queryFn: () => adminRolesService.fetchRoles(),
    staleTime: 5 * 60 * 1000,
  });
}
