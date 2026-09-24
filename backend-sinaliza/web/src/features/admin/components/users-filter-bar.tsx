import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import {
  AdminUsersControllerFindAllV1Status,
  type AdminUsersControllerFindAllV1Status as TStatus,
} from '@core/api/generated/sinalizaAPI.schemas';
import { ApiSelect } from '@shared/ui/api-select';
import { Input } from '@shared/ui/input';
import { Label } from '@shared/ui/label';
import { Grid, Stack } from '@shared/ui/layout';

import { useRolesQuery } from '../queries/admin-roles.queries';
import type { IAdminUserFilters } from '../types/admin-user-filters.type';

export interface UsersFilterBarProps {
  filters: IAdminUserFilters;
  onChange: <K extends keyof IAdminUserFilters>(key: K, value: IAdminUserFilters[K]) => void;
}

const STATUS_OPTIONS: TStatus[] = [
  AdminUsersControllerFindAllV1Status.ACTIVE,
  AdminUsersControllerFindAllV1Status.INACTIVE,
  AdminUsersControllerFindAllV1Status.PENDING,
];

export function UsersFilterBar({ filters, onChange }: UsersFilterBarProps): ReactElement {
  const { t } = useTranslation('admin');
  const rolesQuery = useRolesQuery();

  const roleOptions = (rolesQuery.data?.data ?? []).map((role) => ({
    value: role.uuid,
    label: role.name,
  }));
  const selectedRole = roleOptions.find((option) => option.value === filters.roleUuid);

  const statusOptions = STATUS_OPTIONS.map((status) => ({
    value: status,
    label: t(`usersPermissions.status.${status}`),
  }));
  const selectedStatus = statusOptions.find((option) => option.value === filters.status);

  return (
    <Grid columns={3} gap={4} className="grid-cols-1 sm:grid-cols-3">
      <Stack gap={2}>
        <Label htmlFor="users-search">{t('usersPermissions.filters.searchLabel')}</Label>
        <Input
          id="users-search"
          value={filters.search}
          onChange={(event) => onChange('search', event.target.value)}
          placeholder={t('usersPermissions.filters.searchPlaceholder')}
        />
      </Stack>

      <Stack gap={2}>
        <Label htmlFor="users-role">{t('usersPermissions.filters.roleLabel')}</Label>
        <ApiSelect
          value={filters.roleUuid}
          onChange={(value) => onChange('roleUuid', value)}
          options={roleOptions}
          selectedOption={selectedRole}
          isLoading={rolesQuery.isLoading}
          placeholder={t('usersPermissions.filters.rolePlaceholder')}
          emptyMessage={t('usersPermissions.filters.roleEmpty')}
        />
      </Stack>

      <Stack gap={2}>
        <Label htmlFor="users-status">{t('usersPermissions.filters.statusLabel')}</Label>
        <ApiSelect
          value={filters.status}
          onChange={(value) => onChange('status', value as TStatus | undefined)}
          options={statusOptions}
          selectedOption={selectedStatus}
          placeholder={t('usersPermissions.filters.statusPlaceholder')}
          emptyMessage={t('usersPermissions.filters.statusEmpty')}
        />
      </Stack>
    </Grid>
  );
}
