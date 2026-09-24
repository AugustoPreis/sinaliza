import type { AdminUsersControllerFindAllV1Status } from '@core/api/generated/sinalizaAPI.schemas';

export interface IAdminUserFilters extends Record<string, unknown> {
  search: string;
  status?: AdminUsersControllerFindAllV1Status;
  roleUuid?: string;
}
