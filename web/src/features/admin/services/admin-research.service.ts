import { getAdminResearch } from '@core/api/generated/admin-research/admin-research';
import type {
  ResearchControllerExportV1Params,
  ResearchControllerIndicatorsV1Params,
  ResearchIndicatorsResponseDTO,
} from '@core/api/generated/sinalizaAPI.schemas';
import { axiosInstance } from '@core/api/http/axios';

const adminResearch = getAdminResearch();

export function fetchResearchIndicators(
  params?: ResearchControllerIndicatorsV1Params,
): Promise<ResearchIndicatorsResponseDTO> {
  return adminResearch.researchControllerIndicatorsV1(params);
}

// Same situation as the users import template: this streams a binary
// spreadsheet, so it's fetched directly with `responseType: 'blob'`.
export async function exportResearchData(
  params?: ResearchControllerExportV1Params,
): Promise<Blob> {
  const response = await axiosInstance.get('/api/v1/admin/research/export', {
    params,
    responseType: 'blob',
  });

  return response.data as Blob;
}
