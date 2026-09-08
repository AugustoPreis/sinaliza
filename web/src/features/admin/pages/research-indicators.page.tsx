import { Download } from 'lucide-react';
import { useState, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { Can } from '@core/auth/can';
import { mapAxiosErrorToAppError } from '@core/errors/error.mapper';
import { useListQueryParams } from '@shared/hooks/use-list-query-params.hook';
import { Button } from '@shared/ui/button';
import { Container, HStack, Stack } from '@shared/ui/layout';
import { LoadingState } from '@shared/ui/loading-state';
import { Heading } from '@shared/ui/typography';
import { downloadBlob } from '@shared/utils/download-blob';

import { ResearchFilterBar } from '../components/research-filter-bar';
import { ResearchIndicatorsView } from '../components/research-indicators-view';
import { useResearchIndicatorsQuery } from '../queries/admin-research.queries';
import * as adminResearchService from '../services/admin-research.service';
import type { IResearchFilters } from '../types/research-filters.type';

const DEFAULT_FILTERS: IResearchFilters = {};
const EXPORT_FILENAME = 'indicadores_pesquisa_sinaliza.xlsx';

export function AdminResearchIndicatorsPage(): ReactElement {
  const { t } = useTranslation('admin');
  const { filters, setFilter, debouncedFilters } =
    useListQueryParams<IResearchFilters>(DEFAULT_FILTERS);
  const [isExporting, setIsExporting] = useState(false);

  const indicatorsQuery = useResearchIndicatorsQuery({
    sector_id: debouncedFilters.sectorId,
    building_id: debouncedFilters.buildingId,
    from: debouncedFilters.from,
    to: debouncedFilters.to,
  });

  async function handleExport(): Promise<void> {
    setIsExporting(true);

    try {
      const blob = await adminResearchService.exportResearchData({
        from: debouncedFilters.from,
        to: debouncedFilters.to,
      });
      downloadBlob(blob, EXPORT_FILENAME);
    } catch (error) {
      toast.error(
        mapAxiosErrorToAppError(error as Parameters<typeof mapAxiosErrorToAppError>[0]).message,
      );
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <Container>
      <Stack gap={6}>
        <HStack align="center" justify="between" wrap gap={4}>
          <Heading level={1}>{t('research.title')}</Heading>
          <Can permission="research:export">
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleExport()}
              disabled={isExporting}
            >
              <Download size={16} aria-hidden="true" />
              {t('research.exportButton')}
            </Button>
          </Can>
        </HStack>

        <ResearchFilterBar filters={filters} onChange={setFilter} />

        {indicatorsQuery.isLoading ? (
          <LoadingState message={t('research.loading')} />
        ) : indicatorsQuery.data ? (
          <ResearchIndicatorsView indicators={indicatorsQuery.data} />
        ) : null}
      </Stack>
    </Container>
  );
}
