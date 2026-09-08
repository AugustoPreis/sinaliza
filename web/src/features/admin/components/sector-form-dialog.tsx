import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo, useState, type ReactElement, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { mapAxiosErrorToAppError } from '@core/errors/error.mapper';
import { useDebounce } from '@shared/hooks/use-debounce.hook';
import { Button } from '@shared/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@shared/ui/dialog';
import { FormField } from '@shared/ui/form';
import { Input } from '@shared/ui/input';
import { Stack } from '@shared/ui/layout';
import { MultiSelect, type IMultiSelectOption } from '@shared/ui/multi-select';

import { useCreateSectorMutation, useUpdateSectorMutation } from '../queries/admin-sectors.queries';
import { useAdminUsersQuery } from '../queries/admin-users.queries';
import { sectorFormSchema, type SectorFormValues } from '../schemas/sector-form.schema';
import type { IAdminSector } from '../services/admin-sectors.service';

import { TagInput } from './tag-input';

export interface SectorFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sector?: IAdminSector;
  trigger?: ReactNode;
}

export function SectorFormDialog({
  open,
  onOpenChange,
  sector,
}: SectorFormDialogProps): ReactElement {
  const { t } = useTranslation('admin');
  const [userSearch, setUserSearch] = useState('');
  const debouncedSearch = useDebounce(userSearch, 400);
  const isEditing = Boolean(sector);

  const usersQuery = useAdminUsersQuery({ search: debouncedSearch || undefined, perPage: 20 });
  const createMutation = useCreateSectorMutation();
  const updateMutation = useUpdateSectorMutation();
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const form = useForm<SectorFormValues>({
    resolver: zodResolver(sectorFormSchema),
    defaultValues: {
      name: sector?.name ?? '',
      categories: sector?.categories ?? [],
      responsible_user_ids: sector?.responsible_users.map((user) => user.id) ?? [],
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: sector?.name ?? '',
        categories: sector?.categories ?? [],
        responsible_user_ids: sector?.responsible_users.map((user) => user.id) ?? [],
      });
    }
  }, [open, sector, form]);

  const knownUserOptions = useMemo(() => {
    const map = new Map<string, IMultiSelectOption>();

    for (const user of sector?.responsible_users ?? []) {
      map.set(user.id, { value: user.id, label: `${user.name} (${user.email})` });
    }

    for (const user of usersQuery.data?.data ?? []) {
      map.set(user.uuid, { value: user.uuid, label: `${user.name} (${user.email})` });
    }

    return map;
  }, [sector, usersQuery.data]);

  const userOptions = Array.from(knownUserOptions.values());

  function handleOpenChange(nextOpen: boolean): void {
    onOpenChange(nextOpen);

    if (!nextOpen) {
      form.reset();
    }
  }

  function onSubmit(values: SectorFormValues): void {
    function onSuccess(): void {
      toast.success(isEditing ? t('sectors.form.updateSuccess') : t('sectors.form.createSuccess'));
      handleOpenChange(false);
    }

    function onError(error: Parameters<typeof mapAxiosErrorToAppError>[0]): void {
      toast.error(mapAxiosErrorToAppError(error).message);
    }

    if (isEditing && sector) {
      updateMutation.mutate({ sectorId: sector.id, dto: values }, { onSuccess, onError });

      return;
    }

    createMutation.mutate(values, { onSuccess, onError });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t('sectors.form.editTitle') : t('sectors.form.createTitle')}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Stack gap={4}>
            <FormField
              control={form.control}
              name="name"
              label={t('sectors.form.nameLabel')}
              render={(field) => <Input {...field} />}
            />

            <FormField
              control={form.control}
              name="categories"
              label={t('sectors.form.categoriesLabel')}
              render={(field) => (
                <TagInput
                  value={field.value}
                  onChange={field.onChange}
                  placeholder={t('sectors.form.categoriesPlaceholder')}
                />
              )}
            />

            <FormField
              control={form.control}
              name="responsible_user_ids"
              label={t('sectors.form.responsibleUsersLabel')}
              render={(field) => (
                <MultiSelect
                  value={field.value}
                  onChange={field.onChange}
                  onSearch={setUserSearch}
                  options={userOptions}
                  selectedOptions={field.value.map(
                    (id) => knownUserOptions.get(id) ?? { value: id, label: id },
                  )}
                  isLoading={usersQuery.isLoading}
                  placeholder={t('sectors.form.responsibleUsersPlaceholder')}
                  searchPlaceholder={t('sectors.form.responsibleUsersSearchPlaceholder')}
                  emptyMessage={t('sectors.form.responsibleUsersEmpty')}
                />
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isSubmitting}
              >
                {t('sectors.form.cancel')}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {t('sectors.form.save')}
              </Button>
            </DialogFooter>
          </Stack>
        </form>
      </DialogContent>
    </Dialog>
  );
}
