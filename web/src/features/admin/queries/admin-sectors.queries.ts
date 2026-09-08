import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import type {
  AdminSectorsControllerFindAllV1Params,
  CreateSectorDTO,
  SectorMutationResponseDTO,
} from '@core/api/generated/sinalizaAPI.schemas';
import type { ApiError } from '@core/errors/error.types';

import * as adminSectorsService from '../services/admin-sectors.service';
import type {
  IAdminSectorsResponse,
  IUpdateSectorPayload,
} from '../services/admin-sectors.service';

export const adminSectorQueryKeys = {
  all: ['admin-sectors'] as const,
  list: (params: AdminSectorsControllerFindAllV1Params) =>
    [...adminSectorQueryKeys.all, 'list', params] as const,
};

export function useAdminSectorsQuery(
  params: AdminSectorsControllerFindAllV1Params = {},
): UseQueryResult<IAdminSectorsResponse> {
  return useQuery({
    queryKey: adminSectorQueryKeys.list(params),
    queryFn: () => adminSectorsService.fetchAdminSectors(params),
    placeholderData: (previousData) => previousData,
  });
}

export function useCreateSectorMutation(): UseMutationResult<
  SectorMutationResponseDTO,
  ApiError,
  CreateSectorDTO
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto) => adminSectorsService.createSector(dto),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminSectorQueryKeys.all });
    },
  });
}

export interface IUpdateSectorMutationVariables {
  sectorId: string;
  dto: IUpdateSectorPayload;
}

export function useUpdateSectorMutation(): UseMutationResult<
  SectorMutationResponseDTO,
  ApiError,
  IUpdateSectorMutationVariables
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ sectorId, dto }) => adminSectorsService.updateSector(sectorId, dto),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminSectorQueryKeys.all });
    },
  });
}
