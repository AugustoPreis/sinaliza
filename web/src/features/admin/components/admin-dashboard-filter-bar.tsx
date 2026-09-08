import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import {
  AdminTicketsControllerFindAllV1StatusItem,
  type AdminTicketsControllerFindAllV1StatusItem as TStatus,
} from '@core/api/generated/sinalizaAPI.schemas';
import { ApiSelect } from '@shared/ui/api-select';
import { Input } from '@shared/ui/input';
import { Label } from '@shared/ui/label';
import { Box, Grid, Stack } from '@shared/ui/layout';
import { MultiSelect } from '@shared/ui/multi-select';

import { useLocationsQuery } from '@features/tickets';

import { useAdminSectorsQuery } from '../queries/admin-sectors.queries';
import type { IAdminTicketFilters } from '../types/admin-ticket-filters.type';

export interface AdminDashboardFilterBarProps {
  filters: IAdminTicketFilters;
  onChange: <K extends keyof IAdminTicketFilters>(key: K, value: IAdminTicketFilters[K]) => void;
  showSearch?: boolean;
}

const STATUS_OPTIONS: TStatus[] = [
  AdminTicketsControllerFindAllV1StatusItem.OPEN,
  AdminTicketsControllerFindAllV1StatusItem.FORWARDED,
  AdminTicketsControllerFindAllV1StatusItem.IN_PROGRESS,
  AdminTicketsControllerFindAllV1StatusItem.RESOLVED,
];

export function AdminDashboardFilterBar({
  filters,
  onChange,
  showSearch = false,
}: AdminDashboardFilterBarProps): ReactElement {
  const { t } = useTranslation('admin');
  const { t: tTickets } = useTranslation('tickets');
  const locationsQuery = useLocationsQuery();
  const sectorsQuery = useAdminSectorsQuery();

  const buildings = locationsQuery.data?.buildings ?? [];
  const buildingOptions = buildings.map((building) => ({ value: building.id, label: building.name }));
  const selectedBuilding = buildingOptions.find((option) => option.value === filters.buildingId);

  const sectors = sectorsQuery.data?.items ?? [];
  const sectorOptions = sectors.map((sector) => ({ value: sector.id, label: sector.name }));
  const selectedSector = sectorOptions.find((option) => option.value === filters.sectorId);

  const statusOptions = STATUS_OPTIONS.map((status) => ({
    value: status,
    label: tTickets(`status.${status}`),
  }));
  const selectedStatusOptions = statusOptions.filter((option) => filters.status.includes(option.value));

  return (
    <Grid columns={4} gap={4} className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      <Stack gap={2}>
        <Label htmlFor="dashboard-sector">{t('dashboard.filters.sectorLabel')}</Label>
        <ApiSelect
          value={filters.sectorId}
          onChange={(value) => onChange('sectorId', value)}
          options={sectorOptions}
          selectedOption={selectedSector}
          isLoading={sectorsQuery.isLoading}
          placeholder={t('dashboard.filters.sectorPlaceholder')}
          emptyMessage={t('dashboard.filters.sectorEmpty')}
        />
      </Stack>

      <Stack gap={2}>
        <Label htmlFor="dashboard-status">{t('dashboard.filters.statusLabel')}</Label>
        <MultiSelect
          value={filters.status}
          onChange={(value) => onChange('status', value as TStatus[])}
          options={statusOptions}
          selectedOptions={selectedStatusOptions}
          placeholder={t('dashboard.filters.statusPlaceholder')}
          emptyMessage={t('dashboard.filters.statusEmpty')}
        />
      </Stack>

      <Stack gap={2}>
        <Label htmlFor="dashboard-building">{t('dashboard.filters.buildingLabel')}</Label>
        <ApiSelect
          value={filters.buildingId}
          onChange={(value) => onChange('buildingId', value)}
          options={buildingOptions}
          selectedOption={selectedBuilding}
          isLoading={locationsQuery.isLoading}
          placeholder={t('dashboard.filters.buildingPlaceholder')}
          emptyMessage={t('dashboard.filters.buildingEmpty')}
        />
      </Stack>

      <Box>
        <Stack gap={2}>
          <Label htmlFor="dashboard-from">{t('dashboard.filters.periodLabel')}</Label>
          <Grid columns={2} gap={2}>
            <Input
              id="dashboard-from"
              type="date"
              value={filters.from ?? ''}
              onChange={(event) => onChange('from', event.target.value || undefined)}
            />
            <Input
              id="dashboard-to"
              type="date"
              value={filters.to ?? ''}
              onChange={(event) => onChange('to', event.target.value || undefined)}
            />
          </Grid>
        </Stack>
      </Box>

      {showSearch ? (
        <Stack gap={2}>
          <Label htmlFor="dashboard-search">{t('dashboard.filters.searchLabel')}</Label>
          <Input
            id="dashboard-search"
            value={filters.search}
            onChange={(event) => onChange('search', event.target.value)}
            placeholder={t('dashboard.filters.searchPlaceholder')}
          />
        </Stack>
      ) : null}
    </Grid>
  );
}
