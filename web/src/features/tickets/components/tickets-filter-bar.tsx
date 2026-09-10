import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import {
  SectorTicketsControllerFindAllV1StatusItem,
  type SectorTicketsControllerFindAllV1StatusItem as TStatus,
} from '@core/api/generated/sinalizaAPI.schemas';
import { ApiSelect } from '@shared/ui/api-select';
import { DatePicker } from '@shared/ui/date-picker';
import { Input } from '@shared/ui/input';
import { Label } from '@shared/ui/label';
import { Grid, Stack } from '@shared/ui/layout';
import { MultiSelect } from '@shared/ui/multi-select';

import { useLocationsQuery } from '../queries/locations.queries';
import type { ISectorTicketFilters } from '../types/sector-ticket-filters.type';

export interface TicketsFilterBarProps {
  filters: ISectorTicketFilters;
  onChange: <K extends keyof ISectorTicketFilters>(key: K, value: ISectorTicketFilters[K]) => void;
}

// The queue only ever holds active tickets — RESOLVED has its own screen
// (`/tickets/resolved`), and OPEN is never actually reachable (tickets are
// created directly as FORWARDED, see `CreateTicketUseCase`).
const STATUS_OPTIONS: TStatus[] = [
  SectorTicketsControllerFindAllV1StatusItem.FORWARDED,
  SectorTicketsControllerFindAllV1StatusItem.IN_PROGRESS,
];

export function TicketsFilterBar({ filters, onChange }: TicketsFilterBarProps): ReactElement {
  const { t } = useTranslation('tickets');
  const { t: tCommon } = useTranslation();
  const locationsQuery = useLocationsQuery();

  const buildings = locationsQuery.data?.buildings ?? [];
  const buildingOptions = buildings.map((building) => ({
    value: building.id,
    label: building.name,
  }));
  const selectedBuilding = buildingOptions.find((option) => option.value === filters.buildingId);

  const statusOptions = STATUS_OPTIONS.map((status) => ({
    value: status,
    label: t(`status.${status}`),
  }));
  const selectedStatusOptions = statusOptions.filter((option) =>
    filters.status.includes(option.value),
  );

  return (
    <Grid columns={4} gap={4} className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
      <Stack gap={2}>
        <Label htmlFor="ticket-search">{t('filters.searchLabel')}</Label>
        <Input
          id="ticket-search"
          value={filters.search}
          onChange={(event) => onChange('search', event.target.value)}
          placeholder={t('filters.searchPlaceholder')}
        />
      </Stack>

      <Stack gap={2}>
        <Label htmlFor="ticket-status">{t('filters.statusLabel')}</Label>
        <MultiSelect
          value={filters.status}
          onChange={(value) => onChange('status', value as TStatus[])}
          options={statusOptions}
          selectedOptions={selectedStatusOptions}
          placeholder={t('filters.statusPlaceholder')}
          emptyMessage={t('filters.statusEmpty')}
        />
      </Stack>

      <Stack gap={2}>
        <Label htmlFor="ticket-building">{t('filters.buildingLabel')}</Label>
        <ApiSelect
          value={filters.buildingId}
          onChange={(value) => onChange('buildingId', value)}
          options={buildingOptions}
          selectedOption={selectedBuilding}
          isLoading={locationsQuery.isLoading}
          placeholder={t('filters.buildingPlaceholder')}
          emptyMessage={t('filters.buildingEmpty')}
        />
      </Stack>

      <Stack gap={2}>
        <Label htmlFor="ticket-from">{t('filters.periodFromLabel')}</Label>
        <DatePicker
          id="ticket-from"
          value={filters.from}
          onChange={(value) => onChange('from', value)}
          placeholder={tCommon('datePicker.placeholder')}
        />
      </Stack>

      <Stack gap={2}>
        <Label htmlFor="ticket-to">{t('filters.periodToLabel')}</Label>
        <DatePicker
          id="ticket-to"
          value={filters.to}
          onChange={(value) => onChange('to', value)}
          placeholder={tCommon('datePicker.placeholder')}
        />
      </Stack>
    </Grid>
  );
}
