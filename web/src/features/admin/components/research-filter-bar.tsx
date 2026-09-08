import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { ApiSelect } from '@shared/ui/api-select';
import { Input } from '@shared/ui/input';
import { Label } from '@shared/ui/label';
import { Box, Grid, Stack } from '@shared/ui/layout';

import { useLocationsQuery } from '@features/tickets';

import { useAdminSectorsQuery } from '../queries/admin-sectors.queries';
import type { IResearchFilters } from '../types/research-filters.type';

export interface ResearchFilterBarProps {
  filters: IResearchFilters;
  onChange: <K extends keyof IResearchFilters>(key: K, value: IResearchFilters[K]) => void;
}

export function ResearchFilterBar({ filters, onChange }: ResearchFilterBarProps): ReactElement {
  const { t } = useTranslation('admin');
  const locationsQuery = useLocationsQuery();
  const sectorsQuery = useAdminSectorsQuery();

  const buildings = locationsQuery.data?.buildings ?? [];
  const buildingOptions = buildings.map((building) => ({ value: building.id, label: building.name }));
  const selectedBuilding = buildingOptions.find((option) => option.value === filters.buildingId);

  const sectors = sectorsQuery.data?.items ?? [];
  const sectorOptions = sectors.map((sector) => ({ value: sector.id, label: sector.name }));
  const selectedSector = sectorOptions.find((option) => option.value === filters.sectorId);

  return (
    <Grid columns={3} gap={4} className="grid-cols-1 sm:grid-cols-3">
      <Stack gap={2}>
        <Label htmlFor="research-sector">{t('research.filters.sectorLabel')}</Label>
        <ApiSelect
          value={filters.sectorId}
          onChange={(value) => onChange('sectorId', value)}
          options={sectorOptions}
          selectedOption={selectedSector}
          isLoading={sectorsQuery.isLoading}
          placeholder={t('research.filters.sectorPlaceholder')}
          emptyMessage={t('research.filters.sectorEmpty')}
        />
      </Stack>

      <Stack gap={2}>
        <Label htmlFor="research-building">{t('research.filters.buildingLabel')}</Label>
        <ApiSelect
          value={filters.buildingId}
          onChange={(value) => onChange('buildingId', value)}
          options={buildingOptions}
          selectedOption={selectedBuilding}
          isLoading={locationsQuery.isLoading}
          placeholder={t('research.filters.buildingPlaceholder')}
          emptyMessage={t('research.filters.buildingEmpty')}
        />
      </Stack>

      <Box>
        <Stack gap={2}>
          <Label htmlFor="research-from">{t('research.filters.periodLabel')}</Label>
          <Grid columns={2} gap={2}>
            <Input
              id="research-from"
              type="date"
              value={filters.from ?? ''}
              onChange={(event) => onChange('from', event.target.value || undefined)}
            />
            <Input
              id="research-to"
              type="date"
              value={filters.to ?? ''}
              onChange={(event) => onChange('to', event.target.value || undefined)}
            />
          </Grid>
        </Stack>
      </Box>
    </Grid>
  );
}
