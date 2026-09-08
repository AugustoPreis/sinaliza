import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, type ReactElement } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import type { AdminUsersControllerFindAllV1200 } from '@core/api/generated/sinalizaAPI.schemas';
import { mapAxiosErrorToAppError } from '@core/errors/error.mapper';
import { Button } from '@shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@shared/ui/dialog';
import { FormField } from '@shared/ui/form';
import { Stack } from '@shared/ui/layout';
import { MultiSelect } from '@shared/ui/multi-select';

import { useAdminSectorsQuery } from '../queries/admin-sectors.queries';
import { useUpdateUserPermissionsMutation } from '../queries/admin-users.queries';
import {
  ROLE_NAMES,
  userPermissionsFormSchema,
  type UserPermissionsFormValues,
} from '../schemas/user-permissions-form.schema';

type IAdminUser = NonNullable<AdminUsersControllerFindAllV1200['data']>[number];

export interface UserPermissionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: IAdminUser;
}

export function UserPermissionsDialog({
  open,
  onOpenChange,
  user,
}: UserPermissionsDialogProps): ReactElement {
  const { t } = useTranslation('admin');
  const sectorsQuery = useAdminSectorsQuery();
  const updateMutation = useUpdateUserPermissionsMutation();

  const sectors = sectorsQuery.data?.items ?? [];
  const sectorOptions = sectors.map((sector) => ({ value: sector.id, label: sector.name }));

  const form = useForm<UserPermissionsFormValues>({
    resolver: zodResolver(userPermissionsFormSchema),
    defaultValues: {
      roles: user.roles.map((role) => role.name) as UserPermissionsFormValues['roles'],
      sector_ids: user.sectorUuids,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        roles: user.roles.map((role) => role.name) as UserPermissionsFormValues['roles'],
        sector_ids: user.sectorUuids,
      });
    }
  }, [open, user, form]);

  const roleOptions = ROLE_NAMES.map((role) => ({
    value: role,
    label: t(`usersPermissions.roles.${role}`),
  }));

  const roles = useWatch({ control: form.control, name: 'roles' });
  const requiresSectors = roles.includes('SECTOR');

  function handleOpenChange(nextOpen: boolean): void {
    onOpenChange(nextOpen);

    if (!nextOpen) {
      form.reset();
    }
  }

  function onSubmit(values: UserPermissionsFormValues): void {
    updateMutation.mutate(
      {
        userId: user.uuid,
        dto: {
          roles: values.roles,
          sector_ids: requiresSectors ? values.sector_ids : [],
        },
      },
      {
        onSuccess: () => {
          toast.success(t('usersPermissions.dialog.success'));
          handleOpenChange(false);
        },
        onError: (error) => {
          toast.error(mapAxiosErrorToAppError(error).message);
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('usersPermissions.dialog.title', { name: user.name })}</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Stack gap={4}>
            <FormField
              control={form.control}
              name="roles"
              label={t('usersPermissions.dialog.rolesLabel')}
              render={(field) => (
                <MultiSelect
                  value={field.value}
                  onChange={field.onChange}
                  options={roleOptions}
                  selectedOptions={roleOptions.filter((option) => field.value.includes(option.value))}
                  placeholder={t('usersPermissions.dialog.rolesPlaceholder')}
                  emptyMessage={t('usersPermissions.dialog.rolesEmpty')}
                />
              )}
            />

            {requiresSectors ? (
              <FormField
                control={form.control}
                name="sector_ids"
                label={t('usersPermissions.dialog.sectorsLabel')}
                render={(field) => (
                  <MultiSelect
                    value={field.value}
                    onChange={field.onChange}
                    options={sectorOptions}
                    selectedOptions={sectorOptions.filter((option) =>
                      field.value.includes(option.value),
                    )}
                    isLoading={sectorsQuery.isLoading}
                    placeholder={t('usersPermissions.dialog.sectorsPlaceholder')}
                    emptyMessage={t('usersPermissions.dialog.sectorsEmpty')}
                  />
                )}
              />
            ) : null}
          </Stack>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={updateMutation.isPending}
            >
              {t('usersPermissions.dialog.cancel')}
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {t('usersPermissions.dialog.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
