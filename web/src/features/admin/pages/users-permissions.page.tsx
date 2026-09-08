import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { useListQueryParams } from '@shared/hooks/use-list-query-params.hook';
import { Container, Stack } from '@shared/ui/layout';
import { LoadingState } from '@shared/ui/loading-state';
import { Pagination } from '@shared/ui/pagination';
import { Heading } from '@shared/ui/typography';

import { UsersFilterBar } from '../components/users-filter-bar';
import { UsersTable } from '../components/users-table';
import { useAdminUsersQuery } from '../queries/admin-users.queries';
import type { IAdminUserFilters } from '../types/admin-user-filters.type';

const PAGE_SIZE = 20;

const DEFAULT_FILTERS: IAdminUserFilters = {
  search: '',
};

export function AdminUsersPermissionsPage(): ReactElement {
  const { t } = useTranslation('admin');
  const { page, setPage, filters, setFilter, debouncedFilters } =
    useListQueryParams<IAdminUserFilters>(DEFAULT_FILTERS);

  const usersQuery = useAdminUsersQuery({
    page,
    perPage: PAGE_SIZE,
    search: debouncedFilters.search || undefined,
    status: debouncedFilters.status,
    roleUuid: debouncedFilters.roleUuid,
  });

  const items = usersQuery.data?.data ?? [];
  const meta = usersQuery.data?.meta;

  return (
    <Container>
      <Stack gap={6}>
        <Heading level={1}>{t('usersPermissions.title')}</Heading>

        <UsersFilterBar filters={filters} onChange={setFilter} />

        {usersQuery.isLoading ? (
          <LoadingState message={t('usersPermissions.loading')} />
        ) : (
          <Stack gap={4}>
            <UsersTable items={items} />
            {meta ? <Pagination meta={meta} onPageChange={setPage} /> : null}
          </Stack>
        )}
      </Stack>
    </Container>
  );
}
