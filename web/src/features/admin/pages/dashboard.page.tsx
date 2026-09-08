import { useNavigate } from '@tanstack/react-router';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { AdminTicketsControllerFindAllV1StatusItem } from '@core/api/generated/sinalizaAPI.schemas';
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

const PAGE_SIZE = 20;

const DEFAULT_FILTERS: IAdminTicketFilters = {
  status: [
    AdminTicketsControllerFindAllV1StatusItem.OPEN,
    AdminTicketsControllerFindAllV1StatusItem.FORWARDED,
    AdminTicketsControllerFindAllV1StatusItem.IN_PROGRESS,
    AdminTicketsControllerFindAllV1StatusItem.RESOLVED,
  ],
  search: '',
};

// Tela C.1 combines the aggregate indicators panel (`GET /admin/dashboard`)
// with a consolidated by-sector table on the same screen. We additionally
// render the full individual-ticket listing (`GET /admin/tickets`) further
// down this same page — rather than adding a second route — so an admin can
// both see the aggregate picture and drill into any single ticket (reusing
// the shared `/tickets/$ticketId` detail route, which `GetTicketUseCase`
// already grants ADMIN full access to) without leaving the "Painel geral".
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
  };

  const dashboardQuery = useAdminDashboardQuery(commonParams);
  const ticketsQuery = useAdminTicketsQuery({
    ...commonParams,
    page,
    perPage: PAGE_SIZE,
    search: debouncedFilters.search || undefined,
  });

  const items = ticketsQuery.data?.items ?? [];
  const total = ticketsQuery.data?.total ?? 0;
  const pageSize = ticketsQuery.data?.page_size ?? PAGE_SIZE;

  return (
    <Container>
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
