import { useNavigate } from '@tanstack/react-router';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { SectorTicketsControllerFindAllV1StatusItem } from '@core/api/generated/sinalizaAPI.schemas';
import { useListQueryParams } from '@shared/hooks/use-list-query-params.hook';
import { ROUTES } from '@shared/routes';
import { Input } from '@shared/ui/input';
import { Label } from '@shared/ui/label';
import { Container, Stack } from '@shared/ui/layout';
import { LoadingState } from '@shared/ui/loading-state';
import { Pagination } from '@shared/ui/pagination';
import { Heading } from '@shared/ui/typography';

import { TicketsTable } from '../components/tickets-table';
import { useSectorTicketsQuery } from '../queries/tickets.queries';

const PAGE_SIZE = 20;

interface IResolvedFilters extends Record<string, unknown> {
  search: string;
}

export function SectorTicketsResolvedPage(): ReactElement {
  const { t } = useTranslation('tickets');
  const navigate = useNavigate();
  const { page, setPage, filters, setFilter, debouncedFilters } =
    useListQueryParams<IResolvedFilters>({ search: '' });

  const ticketsQuery = useSectorTicketsQuery({
    page,
    perPage: PAGE_SIZE,
    status: [SectorTicketsControllerFindAllV1StatusItem.RESOLVED],
    search: debouncedFilters.search || undefined,
  });

  const items = ticketsQuery.data?.items ?? [];
  const total = ticketsQuery.data?.total ?? 0;
  const pageSize = ticketsQuery.data?.page_size ?? PAGE_SIZE;

  return (
    <Container size="wide">
      <Stack gap={6}>
        <Stack gap={1}>
          <Heading level={1}>{t('resolved.title')}</Heading>
        </Stack>

        <Stack gap={2} className="max-w-sm">
          <Label htmlFor="resolved-search">{t('resolved.searchLabel')}</Label>
          <Input
            id="resolved-search"
            value={filters.search}
            onChange={(event) => setFilter('search', event.target.value)}
            placeholder={t('resolved.searchPlaceholder')}
          />
        </Stack>

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
