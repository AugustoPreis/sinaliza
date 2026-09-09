import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { ApiSelect } from '@shared/ui/api-select';
import { DatePicker } from '@shared/ui/date-picker';
import { Label } from '@shared/ui/label';
import { Grid, Stack } from '@shared/ui/layout';

import { useLocationsQuery } from '@features/tickets';

import { useAdminSectorsQuery } from '../queries/admin-sectors.queries';
import type { IResearchFilters } from '../types/research-filters.type';

export interface ResearchFilterBarProps {
  filters: IResearchFilters;
  onChange: <K extends keyof IResearchFilters>(key: K, value: IResearchFilters[K]) => void;
}

export function ResearchFilterBar({ filters, onChange }: ResearchFilterBarProps): ReactElement {
  const { t } = useTranslation('admin');
  const { t: tCommon } = useTranslation();
  const locationsQuery = useLocationsQuery();
  const sectorsQuery = useAdminSectorsQuery();

  const buildings = locationsQuery.data?.buildings ?? [];
  const buildingOptions = buildings.map((building) => ({
    value: building.id,
    label: building.name,
  }));
  const selectedBuilding = buildingOptions.find((option) => option.value === filters.buildingId);

  const sectors = sectorsQuery.data?.items ?? [];
  const sectorOptions = sectors.map((sector) => ({ value: sector.id, label: sector.name }));
  const selectedSector = sectorOptions.find((option) => option.value === filters.sectorId);

  return (
    <Grid gap={6} className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
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

      <Stack gap={2}>
        <Label htmlFor="research-from">{t('research.filters.periodFromLabel')}</Label>
        <DatePicker
          id="research-from"
          value={filters.from}
          onChange={(value) => onChange('from', value)}
          placeholder={tCommon('datePicker.placeholder')}
        />
      </Stack>

      <Stack gap={2}>
        <Label htmlFor="research-to">{t('research.filters.periodToLabel')}</Label>
        <DatePicker
          id="research-to"
          value={filters.to}
          onChange={(value) => onChange('to', value)}
          placeholder={tCommon('datePicker.placeholder')}
        />
      </Stack>
    </Grid>
  );
}
