import { getAdminUsers } from '@core/api/generated/admin-users/admin-users';
import type {
  AdminUsersControllerFindAllV1200,
  AdminUsersControllerFindAllV1Params,
  ImportUsersResultDTO,
  RevokeUserAccessDTO,
  UpdateUserPermissionsDTO,
  UpdateUserPermissionsResponseDTO,
  UserAccessResponseDTO,
} from '@core/api/generated/sinalizaAPI.schemas';
import { axiosInstance } from '@core/api/http/axios';

const adminUsers = getAdminUsers();

export function fetchAdminUsers(
  params?: AdminUsersControllerFindAllV1Params,
): Promise<AdminUsersControllerFindAllV1200> {
  return adminUsers.adminUsersControllerFindAllV1(params);
}

export function importUsers(file: File): Promise<ImportUsersResultDTO> {
  return adminUsers.adminUsersControllerImportUsersV1({ file });
}

// The generated client types this call as `void` because it streams a
// binary spreadsheet — fetch it directly with `responseType: 'blob'`
// instead of going through the JSON-oriented `customInstance` mutator.
export async function downloadImportTemplate(): Promise<Blob> {
  const response = await axiosInstance.get('/api/v1/admin/users/import-template', {
    responseType: 'blob',
  });

  return response.data as Blob;
}

export function updateUserPermissions(
  userId: string,
  dto: UpdateUserPermissionsDTO,
): Promise<UpdateUserPermissionsResponseDTO> {
  return adminUsers.adminUsersControllerUpdatePermissionsV1(userId, dto);
}

export function revokeUserAccess(
  userId: string,
  dto: RevokeUserAccessDTO,
): Promise<UserAccessResponseDTO> {
  return adminUsers.adminUsersControllerRevokeV1(userId, dto);
}

export function restoreUserAccess(userId: string): Promise<UserAccessResponseDTO> {
  return adminUsers.adminUsersControllerRestoreV1(userId);
}
