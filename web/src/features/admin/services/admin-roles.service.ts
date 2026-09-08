import { getRoles } from '@core/api/generated/roles/roles';
import type { RolesControllerFindAllV1200 } from '@core/api/generated/sinalizaAPI.schemas';

const roles = getRoles();

export function fetchRoles(): Promise<RolesControllerFindAllV1200> {
  return roles.rolesControllerFindAllV1({ perPage: 100 });
}
