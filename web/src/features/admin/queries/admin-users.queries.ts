import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import type {
  AdminUsersControllerFindAllV1200,
  AdminUsersControllerFindAllV1Params,
  ImportUsersResultDTO,
  RevokeUserAccessDTO,
  UpdateUserPermissionsDTO,
  UpdateUserPermissionsResponseDTO,
  UserAccessResponseDTO,
} from '@core/api/generated/sinalizaAPI.schemas';
import type { ApiError } from '@core/errors/error.types';

import * as adminUsersService from '../services/admin-users.service';

export const adminUserQueryKeys = {
  all: ['admin-users'] as const,
  list: (params: AdminUsersControllerFindAllV1Params) =>
    [...adminUserQueryKeys.all, 'list', params] as const,
};

export function useAdminUsersQuery(
  params: AdminUsersControllerFindAllV1Params,
): UseQueryResult<AdminUsersControllerFindAllV1200> {
  return useQuery({
    queryKey: adminUserQueryKeys.list(params),
    queryFn: () => adminUsersService.fetchAdminUsers(params),
    placeholderData: (previousData) => previousData,
  });
}

export function useImportUsersMutation(): UseMutationResult<ImportUsersResultDTO, ApiError, File> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file) => adminUsersService.importUsers(file),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminUserQueryKeys.all });
    },
  });
}

export interface IUpdateUserPermissionsVariables {
  userId: string;
  dto: UpdateUserPermissionsDTO;
}

export function useUpdateUserPermissionsMutation(): UseMutationResult<
  UpdateUserPermissionsResponseDTO,
  ApiError,
  IUpdateUserPermissionsVariables
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, dto }) => adminUsersService.updateUserPermissions(userId, dto),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminUserQueryKeys.all });
    },
  });
}

export interface IRevokeUserAccessVariables {
  userId: string;
  dto: RevokeUserAccessDTO;
}

export function useRevokeUserAccessMutation(): UseMutationResult<
  UserAccessResponseDTO,
  ApiError,
  IRevokeUserAccessVariables
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, dto }) => adminUsersService.revokeUserAccess(userId, dto),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminUserQueryKeys.all });
    },
  });
}

export function useRestoreUserAccessMutation(): UseMutationResult<
  UserAccessResponseDTO,
  ApiError,
  string
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId) => adminUsersService.restoreUserAccess(userId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminUserQueryKeys.all });
    },
  });
}
