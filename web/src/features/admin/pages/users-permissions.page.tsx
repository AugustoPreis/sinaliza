import { Plus, Upload } from 'lucide-react';
import { useState, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { Can } from '@core/auth/can';
import { useListQueryParams } from '@shared/hooks/use-list-query-params.hook';
import { Button } from '@shared/ui/button';
import { Container, HStack, Stack } from '@shared/ui/layout';
import { LoadingState } from '@shared/ui/loading-state';
import { Pagination } from '@shared/ui/pagination';
import { Heading } from '@shared/ui/typography';

import { CreateUserDialog } from '../components/create-user-dialog';
import { ImportUsersDialog } from '../components/import-users-dialog';
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
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
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
    <Container size="wide">
      <Stack gap={6}>
        <HStack align="center" justify="between" wrap gap={4}>
          <Heading level={1}>{t('usersPermissions.title')}</Heading>
          <HStack gap={2}>
            <Can permission="users:import">
              <Button type="button" variant="outline" onClick={() => setIsImportOpen(true)}>
                <Upload size={16} aria-hidden="true" />
                {t('usersPermissions.importButton')}
              </Button>
            </Can>
            <Can permission="users:create">
              <Button type="button" onClick={() => setIsCreateOpen(true)}>
                <Plus size={16} aria-hidden="true" />
                {t('usersPermissions.createButton')}
              </Button>
            </Can>
          </HStack>
        </HStack>

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

      <CreateUserDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
      <ImportUsersDialog open={isImportOpen} onOpenChange={setIsImportOpen} />
    </Container>
  );
}
