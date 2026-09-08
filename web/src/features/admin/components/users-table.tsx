import { ShieldCheck, UserRoundCheck, UserRoundX } from 'lucide-react';
import { useState, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import type { AdminUsersControllerFindAllV1200 } from '@core/api/generated/sinalizaAPI.schemas';
import { Can } from '@core/auth/can';
import { mapAxiosErrorToAppError } from '@core/errors/error.mapper';
import { Badge, type BadgeProps } from '@shared/ui/badge';
import { Button } from '@shared/ui/button';
import { ConfirmDialog } from '@shared/ui/confirm-dialog';
import { DataTable, type IDataTableColumn } from '@shared/ui/data-table';
import { HStack } from '@shared/ui/layout';
import { Text } from '@shared/ui/typography';

import {
  useRestoreUserAccessMutation,
  useRevokeUserAccessMutation,
} from '../queries/admin-users.queries';

import { UserPermissionsDialog } from './user-permissions-dialog';

type IAdminUser = NonNullable<AdminUsersControllerFindAllV1200['data']>[number];

export interface UsersTableProps {
  items: IAdminUser[];
}

const STATUS_VARIANTS: Record<string, BadgeProps['variant']> = {
  ACTIVE: 'success',
  INACTIVE: 'destructive',
  PENDING: 'secondary',
};

export function UsersTable({ items }: UsersTableProps): ReactElement {
  const { t } = useTranslation('admin');
  const [permissionsUser, setPermissionsUser] = useState<IAdminUser | undefined>(undefined);
  const [accessActionUser, setAccessActionUser] = useState<IAdminUser | undefined>(undefined);
  const revokeMutation = useRevokeUserAccessMutation();
  const restoreMutation = useRestoreUserAccessMutation();

  const isRevoked = accessActionUser?.status === 'INACTIVE';

  function handleConfirmAccessAction(): void {
    if (!accessActionUser) {
      return;
    }

    function onSuccess(): void {
      toast.success(
        isRevoked ? t('usersPermissions.access.restoreSuccess') : t('usersPermissions.access.revokeSuccess'),
      );
      setAccessActionUser(undefined);
    }

    function onError(error: Parameters<typeof mapAxiosErrorToAppError>[0]): void {
      toast.error(mapAxiosErrorToAppError(error).message);
    }

    if (isRevoked) {
      restoreMutation.mutate(accessActionUser.uuid, { onSuccess, onError });

      return;
    }

    revokeMutation.mutate({ userId: accessActionUser.uuid, dto: {} }, { onSuccess, onError });
  }

  const columns: IDataTableColumn<IAdminUser>[] = [
    {
      key: 'name',
      header: t('usersPermissions.table.name'),
      cell: (row) => (
        <Text weight="medium" size="sm">
          {row.name}
        </Text>
      ),
    },
    {
      key: 'email',
      header: t('usersPermissions.table.email'),
      cell: (row) => (
        <Text size="sm" tone="muted">
          {row.email}
        </Text>
      ),
    },
    {
      key: 'roles',
      header: t('usersPermissions.table.roles'),
      cell: (row) => (
        <HStack gap={1} wrap>
          {row.roles.map((role) => (
            <Badge key={role.uuid} variant="secondary">
              {role.name}
            </Badge>
          ))}
        </HStack>
      ),
    },
    {
      key: 'status',
      header: t('usersPermissions.table.status'),
      cell: (row) => (
        <Badge variant={STATUS_VARIANTS[row.status]}>
          {t(`usersPermissions.status.${row.status}`)}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      cell: (row) => (
        <HStack gap={2} justify="end">
          <Can permission="users:manage-permissions">
            <Button type="button" variant="ghost" size="sm" onClick={() => setPermissionsUser(row)}>
              <ShieldCheck size={16} aria-hidden="true" />
              {t('usersPermissions.table.editPermissions')}
            </Button>
          </Can>
          <Can permission="users:revoke">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setAccessActionUser(row)}
            >
              {row.status === 'INACTIVE' ? (
                <>
                  <UserRoundCheck size={16} aria-hidden="true" />
                  {t('usersPermissions.table.restore')}
                </>
              ) : (
                <>
                  <UserRoundX size={16} aria-hidden="true" />
                  {t('usersPermissions.table.revoke')}
                </>
              )}
            </Button>
          </Can>
        </HStack>
      ),
    },
  ];

  return (
    <>
      <DataTable
        columns={columns}
        data={items}
        getRowKey={(row) => row.uuid}
        emptyMessage={t('usersPermissions.table.empty')}
      />

      {permissionsUser ? (
        <UserPermissionsDialog
          open={Boolean(permissionsUser)}
          onOpenChange={(open) => {
            if (!open) {
              setPermissionsUser(undefined);
            }
          }}
          user={permissionsUser}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(accessActionUser)}
        onOpenChange={(open) => {
          if (!open) {
            setAccessActionUser(undefined);
          }
        }}
        title={
          isRevoked
            ? t('usersPermissions.access.restoreTitle')
            : t('usersPermissions.access.revokeTitle')
        }
        description={
          isRevoked
            ? t('usersPermissions.access.restoreDescription', { name: accessActionUser?.name })
            : t('usersPermissions.access.revokeDescription', { name: accessActionUser?.name })
        }
        confirmLabel={
          isRevoked ? t('usersPermissions.access.restoreConfirm') : t('usersPermissions.access.revokeConfirm')
        }
        cancelLabel={t('usersPermissions.access.cancel')}
        variant={isRevoked ? 'default' : 'destructive'}
        onConfirm={handleConfirmAccessAction}
        isConfirming={revokeMutation.isPending || restoreMutation.isPending}
      />
    </>
  );
}
