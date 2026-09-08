import { zodResolver } from '@hookform/resolvers/zod';
import type { ReactElement } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { mapAxiosErrorToAppError } from '@core/errors/error.mapper';
import { Button } from '@shared/ui/button';
import { FormField } from '@shared/ui/form';
import { Box, Stack } from '@shared/ui/layout';
import { PasswordInput } from '@shared/ui/password-input';
import { Text } from '@shared/ui/typography';

import { useUpdatePasswordMutation } from '../queries/account.queries';
import {
  updatePasswordSchema,
  type UpdatePasswordFormValues,
} from '../schemas/update-password.schema';

export function ChangePasswordForm(): ReactElement {
  const { t } = useTranslation('account');
  const updatePasswordMutation = useUpdatePasswordMutation();

  const form = useForm<UpdatePasswordFormValues>({
    resolver: zodResolver(updatePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmNewPassword: '' },
  });

  function onSubmit(values: UpdatePasswordFormValues): void {
    updatePasswordMutation.mutate(values, {
      onSuccess: () => {
        toast.success(t('password.success'));
        form.reset();
      },
      onError: (error) => {
        toast.error(mapAxiosErrorToAppError(error).message);
      },
    });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <Stack gap={4}>
        <FormField
          control={form.control}
          name="currentPassword"
          label={t('password.currentLabel')}
          render={(field) => <PasswordInput {...field} />}
        />

        <Box className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Stack gap={2}>
            <FormField
              control={form.control}
              name="newPassword"
              label={t('password.newLabel')}
              render={(field) => <PasswordInput {...field} />}
            />
            <Text size="sm" tone="muted">
              {t('password.newHint')}
            </Text>
          </Stack>

          <FormField
            control={form.control}
            name="confirmNewPassword"
            label={t('password.confirmLabel')}
            render={(field) => <PasswordInput {...field} />}
          />
        </Box>

        <Button type="submit" disabled={updatePasswordMutation.isPending} className="self-end">
          {t('password.submit')}
        </Button>
      </Stack>
    </form>
  );
}
