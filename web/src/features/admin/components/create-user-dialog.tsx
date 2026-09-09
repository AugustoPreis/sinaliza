import { zodResolver } from '@hookform/resolvers/zod';
import type { ReactElement } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import type { CreateUserDTO } from '@core/api/generated/sinalizaAPI.schemas';
import { mapAxiosErrorToAppError } from '@core/errors/error.mapper';
import { ApiSelect, type IApiSelectOption } from '@shared/ui/api-select';
import { Button } from '@shared/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@shared/ui/dialog';
import { FormField } from '@shared/ui/form';
import { Input } from '@shared/ui/input';
import { Stack } from '@shared/ui/layout';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shared/ui/select';

import { useRolesQuery } from '../queries/admin-roles.queries';
import { useAdminSectorsQuery } from '../queries/admin-sectors.queries';
import { useCreateUserMutation } from '../queries/admin-users.queries';
import {
  createUserFormSchema,
  INSTITUTIONAL_LINKS,
  SECTOR_ROLE_ADMIN,
  SECTOR_ROLE_NONE,
  type CreateUserFormValues,
} from '../schemas/create-user-form.schema';

export interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// The created user has no password an admin ever sees — same as the bulk
// import flow (`ImportUsersUseCase`), which hashes a random UUID. They get
// in through "forgot password", not a value we hand out here.
function generateRandomPassword(): string {
  return `Aa1!${crypto.randomUUID()}`;
}

export function CreateUserDialog({ open, onOpenChange }: CreateUserDialogProps): ReactElement {
  const { t } = useTranslation('admin');
  const sectorsQuery = useAdminSectorsQuery();
  const rolesQuery = useRolesQuery();
  const createMutation = useCreateUserMutation();

  const sectors = sectorsQuery.data?.items ?? [];
  const roles = rolesQuery.data?.data ?? [];

  const sectorRoleOptions: IApiSelectOption[] = [
    { value: SECTOR_ROLE_NONE, label: t('usersPermissions.createDialog.sectorRoleNone') },
    { value: SECTOR_ROLE_ADMIN, label: t('usersPermissions.createDialog.sectorRoleAdmin') },
    ...sectors.map((sector) => ({ value: sector.id, label: sector.name })),
  ];

  const form = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserFormSchema),
    defaultValues: {
      name: '',
      email: '',
      institutionalLink: 'ALUNO',
      sectorRole: SECTOR_ROLE_NONE,
    },
  });

  function handleOpenChange(nextOpen: boolean): void {
    onOpenChange(nextOpen);

    if (!nextOpen) {
      form.reset();
    }
  }

  function onSubmit(values: CreateUserFormValues): void {
    const roleName =
      values.sectorRole === SECTOR_ROLE_ADMIN
        ? 'ADMIN'
        : values.sectorRole === SECTOR_ROLE_NONE
          ? 'REQUESTER'
          : 'SECTOR';

    const role = roles.find((candidate) => candidate.name === roleName);

    if (!role) {
      toast.error(t('usersPermissions.createDialog.roleNotConfigured', { role: roleName }));

      return;
    }

    const dto: CreateUserDTO = {
      name: values.name,
      email: values.email,
      password: generateRandomPassword(),
      institutionalLink: values.institutionalLink,
      roleUuids: [role.uuid],
    };

    createMutation.mutate(dto, {
      onSuccess: () => {
        toast.success(t('usersPermissions.createDialog.success'));
        handleOpenChange(false);
      },
      onError: (error) => {
        toast.error(mapAxiosErrorToAppError(error).message);
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('usersPermissions.createDialog.title')}</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Stack gap={4}>
            <FormField
              control={form.control}
              name="name"
              label={t('usersPermissions.createDialog.nameLabel')}
              render={(field) => <Input {...field} />}
            />

            <FormField
              control={form.control}
              name="email"
              label={t('usersPermissions.createDialog.emailLabel')}
              render={(field) => <Input {...field} type="email" />}
            />

            <FormField
              control={form.control}
              name="institutionalLink"
              label={t('usersPermissions.createDialog.institutionalLinkLabel')}
              render={(field) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id={field.id} aria-invalid={field['aria-invalid']}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INSTITUTIONAL_LINKS.map((link) => (
                      <SelectItem key={link} value={link}>
                        {t(`usersPermissions.createDialog.institutionalLinks.${link}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />

            <FormField
              control={form.control}
              name="sectorRole"
              label={t('usersPermissions.createDialog.sectorRoleLabel')}
              render={(field) => (
                <ApiSelect
                  value={field.value}
                  onChange={(value) => field.onChange(value ?? SECTOR_ROLE_NONE)}
                  options={sectorRoleOptions}
                  selectedOption={sectorRoleOptions.find((option) => option.value === field.value)}
                  isLoading={sectorsQuery.isLoading}
                  placeholder={t('usersPermissions.createDialog.sectorRolePlaceholder')}
                  emptyMessage={t('usersPermissions.createDialog.sectorRoleEmpty')}
                />
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={createMutation.isPending}
              >
                {t('usersPermissions.createDialog.cancel')}
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {t('usersPermissions.createDialog.save')}
              </Button>
            </DialogFooter>
          </Stack>
        </form>
      </DialogContent>
    </Dialog>
  );
}
