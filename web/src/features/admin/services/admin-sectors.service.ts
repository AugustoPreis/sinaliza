import { getAdminSectors } from '@core/api/generated/admin-sectors/admin-sectors';
import type {
  AdminSectorsControllerFindAllV1Params,
  CreateSectorDTO,
  SectorMutationResponseDTO,
  UpdateSectorDTO,
} from '@core/api/generated/sinalizaAPI.schemas';

// `GET /admin/sectors` has no documented response schema in the live
// OpenAPI spec (orval generated `void`) - this reflects the actual JSON
// returned by `AdminSectorsController.findAll` / `SectorResponseDTO`.
export interface IAdminSectorResponsibleUser {
  id: string;
  name: string;
  email: string;
}

export interface IAdminSector {
  id: string;
  name: string;
  categories: string[];
  responsible_users: IAdminSectorResponsibleUser[];
}

export interface IAdminSectorsResponse {
  items: IAdminSector[];
}

export interface IUpdateSectorPayload {
  name: string;
  categories: string[];
  responsible_user_ids?: string[];
}

const adminSectors = getAdminSectors();

export function fetchAdminSectors(
  params?: AdminSectorsControllerFindAllV1Params,
): Promise<IAdminSectorsResponse> {
  return adminSectors.adminSectorsControllerFindAllV1(
    params,
  ) as unknown as Promise<IAdminSectorsResponse>;
}

export function createSector(dto: CreateSectorDTO): Promise<SectorMutationResponseDTO> {
  return adminSectors.adminSectorsControllerCreateV1(dto);
}

export function updateSector(
  sectorId: string,
  dto: IUpdateSectorPayload,
): Promise<SectorMutationResponseDTO> {
  return adminSectors.adminSectorsControllerUpdateV1(sectorId, dto as unknown as UpdateSectorDTO);
}
