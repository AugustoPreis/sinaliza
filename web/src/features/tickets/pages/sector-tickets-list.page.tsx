import { useNavigate } from '@tanstack/react-router';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { SectorTicketsControllerFindAllV1StatusItem } from '@core/api/generated/sinalizaAPI.schemas';
import { useListQueryParams } from '@shared/hooks/use-list-query-params.hook';
import { ROUTES } from '@shared/routes';
import { Container, Stack } from '@shared/ui/layout';
import { LoadingState } from '@shared/ui/loading-state';
import { Pagination } from '@shared/ui/pagination';
import { Heading } from '@shared/ui/typography';

import { TicketsFilterBar } from '../components/tickets-filter-bar';
import { TicketsTable } from '../components/tickets-table';
import { useSectorTicketsQuery } from '../queries/tickets.queries';
import type { ISectorTicketFilters } from '../types/sector-ticket-filters.type';

const PAGE_SIZE = 20;

const DEFAULT_FILTERS: ISectorTicketFilters = {
  status: [
    SectorTicketsControllerFindAllV1StatusItem.OPEN,
    SectorTicketsControllerFindAllV1StatusItem.FORWARDED,
    SectorTicketsControllerFindAllV1StatusItem.IN_PROGRESS,
  ],
  search: '',
  order: 'asc',
};

export function SectorTicketsListPage(): ReactElement {
  const { t } = useTranslation('tickets');
  const navigate = useNavigate();
  const { page, setPage, filters, setFilter, debouncedFilters } =
    useListQueryParams<ISectorTicketFilters>(DEFAULT_FILTERS);

  const ticketsQuery = useSectorTicketsQuery({
    page,
    perPage: PAGE_SIZE,
    status: debouncedFilters.status.length > 0 ? debouncedFilters.status : undefined,
    from: debouncedFilters.from,
    to: debouncedFilters.to,
    building_id: debouncedFilters.buildingId,
    search: debouncedFilters.search || undefined,
    order: debouncedFilters.order,
  });

  const items = ticketsQuery.data?.items ?? [];
  const total = ticketsQuery.data?.total ?? 0;
  const pageSize = ticketsQuery.data?.page_size ?? PAGE_SIZE;

  return (
    <Container>
      <Stack gap={6}>
        <Stack gap={1}>
          <Heading level={1}>{t('queue.title')}</Heading>
        </Stack>

        <TicketsFilterBar filters={filters} onChange={setFilter} />

        {ticketsQuery.isLoading ? (
          <LoadingState message={t('table.loading')} />
        ) : (
          <Stack gap={4}>
            <TicketsTable
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
    </Container>
  );
}
