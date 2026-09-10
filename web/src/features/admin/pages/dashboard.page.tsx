import { useNavigate } from '@tanstack/react-router';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { useListQueryParams } from '@shared/hooks/use-list-query-params.hook';
import { ROUTES } from '@shared/routes';
import { Container, Stack } from '@shared/ui/layout';
import { LoadingState } from '@shared/ui/loading-state';
import { Pagination } from '@shared/ui/pagination';
import { Heading, Text } from '@shared/ui/typography';

import { AdminDashboardFilterBar } from '../components/admin-dashboard-filter-bar';
import { AdminDashboardSectorTable } from '../components/admin-dashboard-sector-table';
import { AdminDashboardSummaryCards } from '../components/admin-dashboard-summary-cards';
import { AdminTicketsTable } from '../components/admin-tickets-table';
import { useAdminDashboardQuery, useAdminTicketsQuery } from '../queries/admin-tickets.queries';
import type { IAdminTicketFilters } from '../types/admin-ticket-filters.type';

const PAGE_SIZE = 10;

// Empty = every status - this is an overview panel, not a queue to clear,
// so it shouldn't start narrowed to a subset.
const DEFAULT_FILTERS: IAdminTicketFilters = {
  status: [],
  search: '',
};

// Tela C.1: aggregate indicators + by-sector table plus the full ticket
// listing on one page, so an admin can drill into a ticket without leaving
// the "Painel geral".
export function AdminDashboardPage(): ReactElement {
  const { t } = useTranslation('admin');
  const navigate = useNavigate();
  const { page, setPage, filters, setFilter, debouncedFilters } =
    useListQueryParams<IAdminTicketFilters>(DEFAULT_FILTERS);

  const commonParams = {
    sector_id: debouncedFilters.sectorId,
    status: debouncedFilters.status.length > 0 ? debouncedFilters.status : undefined,
    from: debouncedFilters.from,
    to: debouncedFilters.to,
    building_id: debouncedFilters.buildingId,
    search: debouncedFilters.search || undefined,
  };

  const dashboardQuery = useAdminDashboardQuery(commonParams);
  const ticketsQuery = useAdminTicketsQuery({
    ...commonParams,
    page,
    perPage: PAGE_SIZE,
  });

  const items = ticketsQuery.data?.items ?? [];
  const total = ticketsQuery.data?.total ?? 0;
  const pageSize = ticketsQuery.data?.page_size ?? PAGE_SIZE;

  return (
    <Container size="wide">
      <Stack gap={6}>
        <Stack gap={1}>
          <Heading level={1}>{t('dashboard.title')}</Heading>
        </Stack>

        <AdminDashboardFilterBar filters={filters} onChange={setFilter} showSearch />

        {dashboardQuery.isLoading ? (
          <LoadingState message={t('dashboard.loading')} />
        ) : dashboardQuery.data ? (
          <Stack gap={6}>
            <AdminDashboardSummaryCards summary={dashboardQuery.data.summary} />

            <Stack gap={2}>
              <Text weight="medium" size="sm">
                {t('dashboard.bySector.title')}
              </Text>
              <AdminDashboardSectorTable rows={dashboardQuery.data.by_sector} />
            </Stack>
          </Stack>
        ) : null}

        <Stack gap={2}>
          <Text weight="medium" size="sm">
            {t('dashboard.table.title')}
          </Text>

          {ticketsQuery.isLoading ? (
            <LoadingState message={t('dashboard.table.loading')} />
          ) : (
            <Stack gap={4}>
              <AdminTicketsTable
                items={items}
                onRowClick={(ticket) => void navigate({ to: ROUTES.tickets.detail(ticket.id) })}
              />
              <Pagination
                meta={{
                  page,
                  perPage: pageSize,
                  total,
                  lastPage: Math.max(1, Math.ceil(total / pageSize)),
                }}
                onPageChange={setPage}
              />
            </Stack>
          )}
        </Stack>
      </Stack>
    </Container>
  );
}
